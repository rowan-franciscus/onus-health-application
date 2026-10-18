/**
 * Admin engagement analytics tests
 * Covers each dashboard metric against a fixture with known answers, the
 * endpoint's access control and period validation, and the audit-trail-based
 * deleted-profiles count.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Consultation = require('../models/Consultation');
const EmailQueue = require('../models/EmailQueue');
const AuditEvent = require('../models/AuditEvent');
const { MedicalRecord } = require('../models/MedicalRecord');
const auditService = require('../services/audit.service');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setup');

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date();
const daysAgo = (n) => new Date(NOW.getTime() - n * DAY_MS);
const yearsAgo = (n) =>
  new Date(Date.UTC(NOW.getUTCFullYear() - n, NOW.getUTCMonth(), NOW.getUTCDate()));

const createUser = async (overrides = {}) => {
  const user = new User({
    email: `user${Math.random().toString(36).slice(2)}@example.com`,
    password: 'Password@123',
    firstName: 'Test',
    lastName: 'User',
    role: 'patient',
    isEmailVerified: true,
    isProfileCompleted: true,
    ...overrides
  });
  await user.save();
  return user;
};

// Bypass schema timestamps so fixtures can sit in the past
const backdate = (Model, doc, fields) => Model.collection.updateOne({ _id: doc._id }, { $set: fields });

const createConsultation = (overrides = {}) =>
  Consultation.create({
    general: { specialistName: 'Dr Test', specialty: 'General', reasonForVisit: 'Check-up' },
    status: 'completed',
    ...overrides
  });

let seq = 0;
const auditEvent = (overrides = {}) => {
  seq += 1;
  return {
    seq,
    recorded: NOW,
    type: 'data',
    subtype: 'record-read',
    action: 'R',
    outcome: '0',
    agent: { userId: null, role: 'system' },
    entity: {},
    context: {},
    prevHash: `prev-${seq}`,
    hash: `hash-${seq}`,
    ...overrides
  };
};

let fx;

const seedFixture = async () => {
  const admin = await createUser({ role: 'admin' });

  const activeProvider = await createUser({ role: 'provider', providerProfile: { isVerified: true } });
  const idleProvider = await createUser({ role: 'provider', providerProfile: { isVerified: true } });
  // Registered in the period but never approved
  const unapprovedProvider = await createUser({ role: 'provider', providerProfile: { isVerified: false } });

  // Real patients: one fully onboarded, one who never confirmed their email
  const viewer = await createUser({ patientProfile: { dateOfBirth: yearsAgo(40) } });
  const unverified = await createUser({ isEmailVerified: false, isProfileCompleted: false });

  // Provider-created records: one still unclaimed, one claimed 10 days after creation
  const placeholder = await createUser({
    isOnusUser: false,
    password: undefined,
    isEmailVerified: false,
    isProfileCompleted: false,
    registeredBy: activeProvider._id,
    patientProfile: { dateOfBirth: yearsAgo(18) } // turns 18 today
  });
  const claimed = await createUser({
    registeredBy: activeProvider._id,
    claimedAt: daysAgo(5),
    patientProfile: { dateOfBirth: yearsAgo(80) }
  });
  await backdate(User, claimed, { createdAt: daysAgo(15) });

  // Consultations: one with every section, one with only history (and a
  // whitespace-only management note), a follow-up, and a long-idle draft
  const full = await createConsultation({
    patient: viewer._id,
    provider: activeProvider._id,
    general: {
      specialistName: 'Dr Test',
      specialty: 'General',
      reasonForVisit: 'Check-up',
      diagnosis: 'Healthy'
    },
    history: 'No complaints',
    physicalExamination: 'Normal',
    management: 'Review in a year'
  });
  const partial = await createConsultation({
    patient: viewer._id,
    provider: activeProvider._id,
    history: 'Cough',
    management: '   '
  });
  await createConsultation({
    patient: viewer._id,
    provider: activeProvider._id,
    parentConsultation: full._id
  });
  const draft = await createConsultation({
    patient: viewer._id,
    provider: activeProvider._id,
    status: 'draft',
    general: { specialistName: 'Dr Test', specialty: 'General' }
  });
  await backdate(Consultation, draft, { updatedAt: daysAgo(40) });
  // A deleted (archived) draft by a provider outside the approved cohort:
  // neither finished work nor provider activity
  await createConsultation({
    patient: viewer._id,
    provider: unapprovedProvider._id,
    status: 'archived',
    general: { specialistName: 'Dr Test', specialty: 'General' }
  });

  // Records referenced from the consultations; the deleted one is ignored.
  // The claimed patient's vitals stand alone, outside any consultation.
  const standaloneId = new mongoose.Types.ObjectId();
  await MedicalRecord.collection.insertMany([
    { recordType: 'Vitals', patient: viewer._id, consultation: full._id, date: NOW },
    { recordType: 'Medication', patient: viewer._id, consultation: full._id, date: NOW },
    { recordType: 'Medication', patient: viewer._id, consultation: full._id, date: NOW },
    { recordType: 'Medication', patient: viewer._id, consultation: partial._id, date: NOW },
    { recordType: 'LabResult', patient: viewer._id, consultation: partial._id, date: NOW, isDeleted: true },
    { _id: standaloneId, recordType: 'Vitals', patient: claimed._id, date: NOW }
  ]);

  const email = (template, userId, status) => ({
    to: 'someone@example.com',
    from: 'onus@example.com',
    subject: 'Subject',
    html: '<p>Hi</p>',
    template,
    userId,
    status
  });
  await EmailQueue.insertMany([
    email('verification', viewer._id, 'sent'),
    email('verification', unverified._id, 'sent'),
    email('verification', unverified._id, 'failed'),
    email('consentRequest', placeholder._id, 'sent'),
    email('claimProfileLink', claimed._id, 'sent'),
    email('consentRequest', viewer._id, 'sent'), // existing account: not a sign-up invite
    email('practiceAdminInvite', idleProvider._id, 'pending')
  ]);

  // Replace the model plugin's write events with a controlled audit history
  await auditService.flush();
  await AuditEvent.collection.deleteMany({});
  await AuditEvent.collection.insertMany([
    auditEvent({
      recorded: daysAgo(5),
      type: 'auth',
      subtype: 'login-success',
      action: 'E',
      agent: { userId: idleProvider._id, role: 'provider' }
    }),
    // Opening specific records: two consultations views, one standalone record
    auditEvent({ agent: { userId: viewer._id, role: 'patient' }, entity: { patientId: viewer._id, resourceId: full._id } }),
    auditEvent({ agent: { userId: viewer._id, role: 'patient' }, entity: { patientId: viewer._id, resourceId: full._id } }),
    auditEvent({ agent: { userId: claimed._id, role: 'patient' }, entity: { patientId: claimed._id, resourceId: standaloneId } }),
    // A statistics read names no record, even though it succeeds
    auditEvent({ agent: { userId: unverified._id, role: 'patient' }, entity: { patientId: unverified._id } }),
    // A failed sign-in carries the account it targeted, but isn't usage
    auditEvent({
      type: 'auth',
      subtype: 'login-failure',
      action: 'E',
      outcome: '8',
      agent: { userId: viewer._id, role: 'patient' }
    }),
    auditEvent({ type: 'audit', subtype: 'audit-query', action: 'E', agent: { userId: admin._id, role: 'admin' } }),
    auditEvent({ type: 'security', subtype: 'access-denied', action: 'E', outcome: '8' }),
    auditEvent({ type: 'admin', subtype: 'user-deleted', action: 'E', agent: { userId: admin._id, role: 'admin' } }),
    // Replayed from the dead letter: newest in the chain, oldest in time
    auditEvent({
      recorded: daysAgo(10),
      type: 'auth',
      subtype: 'login-success',
      action: 'E',
      agent: { userId: idleProvider._id, role: 'provider' }
    })
  ]);
  await auditService.init();

  return { admin, activeProvider, idleProvider, viewer };
};

const getEngagement = (params = {}) =>
  request(app)
    .get('/api/admin/analytics/engagement')
    .query(params)
    .set('Authorization', `Bearer ${fx.admin.generateAuthToken()}`);

beforeAll(async () => {
  await setupTestDB();
});

beforeEach(async () => {
  await auditService.flush();
  await clearDatabase();
  await auditService.init();
  seq = 0;
  fx = await seedFixture();
});

afterAll(async () => {
  await auditService.flush();
  await teardownTestDB();
});

describe('GET /api/admin/analytics/engagement', () => {
  it('is restricted to admins', async () => {
    await request(app)
      .get('/api/admin/analytics/engagement')
      .set('Authorization', `Bearer ${fx.activeProvider.generateAuthToken()}`)
      .expect(403);
  });

  it('rejects a start date after the end date', async () => {
    await getEngagement({ startDate: '2026-03-10', endDate: '2026-03-01' }).expect(400);
  });

  it('defaults to the last 30 calendar days, today included', async () => {
    const { body } = await getEngagement().expect(200);
    const pulse = body.platformHealth.activityPulse;
    expect(pulse).toHaveLength(30);
    expect(pulse[pulse.length - 1].day).toBe(NOW.toISOString().slice(0, 10));
    expect(body.period.start).toBe(`${pulse[0].day}T00:00:00.000Z`);
  });

  it('treats a date-only end date as inclusive', async () => {
    const { body } = await getEngagement({ startDate: '2026-03-01', endDate: '2026-03-31' }).expect(200);
    const pulse = body.platformHealth.activityPulse;
    expect(pulse).toHaveLength(31);
    expect(pulse[0].day).toBe('2026-03-01');
    expect(pulse[30].day).toBe('2026-03-31');
  });

  describe('metrics', () => {
    let body;
    beforeEach(async () => {
      ({ body } = await getEngagement().expect(200));
    });

    it('counts providers active this month against approved providers', () => {
      const months = body.retention.activeProvidersByMonth;
      expect(months).toHaveLength(12);
      const current = months[months.length - 1];
      expect(current).toMatchObject({ active: 1, approved: 2, monthToDate: true });
    });

    it('builds nested sign-up funnels per role', () => {
      const { patient, provider } = body.activation.signupFunnel;
      // viewer + unverified registered in the period; claimed registered on claim
      expect(patient.map((s) => s.count)).toEqual([3, 2, 2]);
      // admins are not in the funnel; one of three providers is unapproved
      expect(provider.map((s) => s.stage)).toEqual([
        'Registered',
        'Email confirmed',
        'Profile completed',
        'Approved'
      ]);
      expect(provider.map((s) => s.count)).toEqual([3, 3, 3, 2]);
    });

    it('measures placeholder accounts being claimed', () => {
      expect(body.activation.placeholderConversion).toMatchObject({
        created: 2,
        claimed: 1,
        claimRate: 0.5,
        claimedInPeriod: 1,
        medianDaysToClaim: 10
      });
    });

    it('separates providers who did work from providers who only showed up', () => {
      expect(body.depthOfUse.providerActivity).toMatchObject({
        approved: 2,
        showedUp: 2,
        didSomething: 1,
        shareOfApproved: 0.5
      });
    });

    it('counts patients opening their own records', () => {
      // viewer (shared consultations) and claimed (a standalone record) have
      // records to see; the statistics read names no record, so isn't a view
      expect(body.depthOfUse.patientRecordViews).toMatchObject({
        realPatients: 3,
        withRecords: 2,
        viewed: 2,
        views: 3,
        shareOfWithRecords: 1
      });
    });

    it('ages open drafts by when they were last touched', () => {
      const drafts = body.depthOfUse.abandonedDrafts;
      expect(drafts).toMatchObject({ openDrafts: 1, staleDrafts: 1, startedInPeriod: 4, finishedInPeriod: 3 });
      expect(drafts.byAge.find((b) => b.label === '30–90 days').count).toBe(1);
    });

    it('counts cases that had a follow-up', () => {
      // full (has a follow-up), partial (none); the follow-up itself is not a case
      expect(body.depthOfUse.followUps).toMatchObject({ cases: 2, withFollowUp: 1, rate: 0.5 });
    });

    it('treats whitespace-only sections as empty', () => {
      const { consultations, sections, allFour } = body.recordQuality.writtenSections;
      expect(consultations).toBe(3);
      const counts = Object.fromEntries(sections.map((s) => [s.key, s.count]));
      expect(counts).toEqual({ history: 2, physicalExamination: 1, management: 1, diagnosis: 1 });
      expect(allFour).toBe(1);
    });

    it('counts each record type once per consultation and ignores deleted records', () => {
      const { consultations, withAny, types } = body.recordQuality.recordTypes;
      expect(consultations).toBe(3);
      expect(withAny).toBe(2);
      const counts = Object.fromEntries(types.map((t) => [t.type, t.count]));
      expect(counts).toMatchObject({ Vitals: 1, Medication: 2, LabResult: 0 });
    });

    it('bands patient ages, including a birthday falling today', () => {
      const { bands, unknown, patients } = body.composition.ageGroups;
      const counts = Object.fromEntries(bands.map((b) => [b.label, b.count]));
      expect(counts).toMatchObject({ 'Under 18': 0, '18–29': 1, '30–44': 1, '75+': 1 });
      expect(unknown).toBe(1);
      expect(patients).toBe(4);
    });

    it('reports email failures per template', () => {
      const email = body.platformHealth.emailDelivery;
      expect(email).toMatchObject({ backlog: 1, sent: 5, failed: 1 });
      const verification = email.byTemplate.find((t) => t.template === 'verification');
      expect(verification).toMatchObject({ sent: 2, failed: 1 });
    });

    it('follows invitations through to sign-up', () => {
      const flows = Object.fromEntries(body.platformHealth.emailsVsSignups.map((f) => [f.key, f]));
      expect(flows.verification).toMatchObject({ sent: 2, completed: 1 });
      expect(flows.patientInvite).toMatchObject({ sent: 2, completed: 1 });
      // still pending, so not yet sent
      expect(flows.practiceAdminInvite).toMatchObject({ sent: 0, completed: 0 });
    });

    it('counts usage per day and leaves days before tracking empty', () => {
      const pulse = body.platformHealth.activityPulse;
      const today = pulse[pulse.length - 1];
      // four patient reads + one admin action; the failed sign-in, audit
      // queries and access denials are not usage
      expect(today.count).toBe(5);
      expect(pulse[pulse.length - 6].count).toBe(1);
      expect(pulse[pulse.length - 11].count).toBe(1);
      expect(pulse[0].count).toBeNull();
    });

    it('starts tracking at the earliest event in time, not in the chain', () => {
      expect(body.trackingSince).toBe(daysAgo(10).toISOString());
    });
  });

  it('keeps the activity pulse inside a timed period', async () => {
    // A one-minute window that ends before today's events were recorded
    const { body } = await getEngagement({
      startDate: new Date(NOW.getTime() - 2 * 60 * 1000).toISOString(),
      endDate: new Date(NOW.getTime() - 60 * 1000).toISOString()
    }).expect(200);
    body.platformHealth.activityPulse.forEach(({ count }) => expect(count === null || count === 0).toBe(true));
  });
});

describe('GET /api/admin/analytics/dashboard', () => {
  it('counts deleted profiles from the audit trail', async () => {
    const { body } = await request(app)
      .get('/api/admin/analytics/dashboard')
      .set('Authorization', `Bearer ${fx.admin.generateAuthToken()}`)
      .expect(200);
    expect(body.deletedProfiles).toBe(1);
  });
});
