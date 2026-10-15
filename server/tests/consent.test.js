/**
 * Patient consent for provider-initiated onboarding.
 * Covers: server-side enforcement on every clinical endpoint, consent token
 * lifecycle (single use, expiry, DOB lockout, resend), email + DOB duplicate
 * matching, claiming, withdrawal, deferrals, audit events and the report.
 */

const crypto = require('crypto');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Connection = require('../models/Connection');
const EmailQueue = require('../models/EmailQueue');
const AuditEvent = require('../models/AuditEvent');
const Practice = require('../models/Practice');
const auditService = require('../services/audit.service');
const { verifyChain } = require('../utils/auditChain');
const { CURRENT_VERSION } = require('../config/consentText');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setup');

const DOB = '1990-04-15';
const UA = 'consent-test-agent/1.0';
const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const oid = () => new mongoose.Types.ObjectId();

const flushAudit = async () => {
  await new Promise((resolve) => setImmediate(resolve));
  await auditService.flush();
};

let seq = 0;
const makeUser = async (overrides = {}) => {
  seq += 1;
  const user = new User({
    email: `user${seq}@example.com`,
    password: 'Password@123',
    firstName: 'Test',
    lastName: `User${seq}`,
    role: 'patient',
    isEmailVerified: true,
    ...overrides
  });
  await user.save();
  return user;
};

const makeProvider = (overrides = {}) => makeUser({
  role: 'provider',
  firstName: 'Paula',
  lastName: 'Provider',
  providerProfile: { isVerified: true },
  ...overrides
});

const makePlaceholder = (overrides = {}) => makeUser({
  isOnusUser: false,
  password: undefined,
  isEmailVerified: false,
  patientProfile: { dateOfBirth: new Date(DOB), gender: 'female' },
  ...overrides
});

const authHeader = (user) => ({ Authorization: `Bearer ${user.generateAuthToken()}` });

const connect = (patient, provider, status, source = 'provider_initiated') => new Connection({
  patient: patient._id,
  provider: provider._id,
  initiatedBy: provider._id,
  onboardingSource: source,
  consent: { status }
}).save();

const addPatient = (provider, body) => request(app)
  .post('/api/patients/register-new')
  .set(authHeader(provider))
  .send({ firstName: 'Nomsa', lastName: 'Dlamini', gender: 'female', dateOfBirth: DOB, ...body });

const latestEmail = (to, template) => EmailQueue.findOne({ to, template }).sort({ createdAt: -1, _id: -1 });
const tokenFrom = (url, marker) => url.split(`/${marker}/`)[1];

const consentTokenFor = async (email) => tokenFrom((await latestEmail(email, 'consentRequest')).templateData.consentUrl, 'consent');
const claimTokenFor = async (email) => tokenFrom((await latestEmail(email, 'consentRequest')).templateData.claimUrl, 'claim');

const respond = (token, body) => request(app)
  .post(`/api/consent/${token}/respond`)
  .set('User-Agent', UA)
  .send({ dateOfBirth: DOB, decision: 'accept', textVersion: CURRENT_VERSION, ...body });

beforeAll(async () => {
  await setupTestDB();
  await User.init();
  await Connection.init();
});

beforeEach(async () => {
  await auditService.flush();
  await clearDatabase();
  await auditService.init();
});

afterAll(async () => {
  await auditService.flush();
  await teardownTestDB();
});

describe('Connection schema', () => {
  it('refuses to save a connection without an explicit consent status', async () => {
    const patient = await makeUser();
    const provider = await makeProvider();
    const connection = new Connection({
      patient: patient._id, provider: provider._id, initiatedBy: provider._id, onboardingSource: 'provider_initiated'
    });
    await expect(connection.save()).rejects.toThrow(/consent.status/);
  });
});

describe('Server-side enforcement of patient consent', () => {
  let provider;
  let patient;
  let connection;
  let ids;

  // Every clinical write, plus the access-escalation (sharing) endpoint
  const writes = () => [
    ['post', '/api/consultations', { patient: patient._id, general: { specialistName: 'Dr', specialty: 'GP' } }],
    ['put', `/api/consultations/${ids.consultation}`, { status: 'draft' }],
    ['post', `/api/consultations/${ids.consultation}/follow-ups`, { general: { specialistName: 'Dr', specialty: 'GP' } }],
    ['post', `/api/consultations/${ids.consultation}/close`],
    ['post', `/api/consultations/${ids.consultation}/reopen`],
    ['delete', `/api/consultations/${ids.consultation}`],
    ['post', `/api/consultations/${ids.consultation}/attachments`],
    ['delete', `/api/consultations/${ids.consultation}/attachments/${oid()}`],
    ['post', `/api/consultations/${ids.consultation}/vitals`, { heartRate: { value: 70 } }],
    ['put', `/api/consultations/${ids.consultation}/vitals/${oid()}`, {}],
    ['post', `/api/consultations/${ids.consultation}/medications`, { name: 'x' }],
    ['post', `/api/consultations/${ids.consultation}/immunizations`, { vaccineName: 'x' }],
    ['post', `/api/consultations/${ids.consultation}/lab-results`, { testName: 'x' }],
    ['post', `/api/consultations/${ids.consultation}/radiology-reports`, { typeOfScan: 'x' }],
    ['post', `/api/consultations/${ids.consultation}/hospital-records`, { hospitalName: 'x' }],
    ['post', `/api/consultations/${ids.consultation}/surgery-records`, { typeOfSurgery: 'x' }],
    ['post', '/api/provider/consultations', { patientId: patient._id, consultationData: {} }],
    ['put', `/api/provider/consultations/${ids.consultation}`, {}],
    ['post', '/api/medical-records/provider/immunizations', { patientId: patient._id, vaccineName: 'x' }],
    ['post', '/api/medical-records/provider/hospital-records', { patientId: patient._id, hospitalName: 'x' }],
    ['post', '/api/medical-records/provider/surgery-records', { patientId: patient._id, typeOfSurgery: 'x' }],
    ['post', '/api/surgeries', { patient: patient._id, surgeryType: 'x', date: '2026-01-01', reason: 'x' }],
    ['post', `/api/surgeries/${ids.surgery}/notes`, { note: 'x' }],
    ['patch', `/api/surgeries/${ids.surgery}/close`],
    ['patch', `/api/surgeries/${ids.surgery}/reopen`],
    ['post', '/api/hospital-admissions', { patient: patient._id, hospitalName: 'x', admissionDate: '2026-01-01', reasonForHospitalization: 'x' }],
    ['post', `/api/hospital-admissions/${ids.admission}/observations`, { note: 'x' }],
    ['patch', `/api/hospital-admissions/${ids.admission}/discharge`],
    ['patch', `/api/hospital-admissions/${ids.admission}/readmit`],
    ['post', `/api/biometrics/${patient._id}`, { weight: 70, height: 170, date: '2026-01-01' }],
    ['post', `/api/patients/${patient._id}/physical-records`],
    ['delete', `/api/patients/${patient._id}/physical-records/${ids.physicalRecord}`],
    ['post', `/api/connections/provider/request-full-access/${connection._id}`]
  ];

  // Clinical reads: blocked whenever consent isn't active (e.g. after decline/withdrawal)
  const reads = () => [
    `/api/consultations/${ids.consultation}`,
    `/api/consultations/${ids.consultation}/vitals`,
    `/api/provider/consultations/${ids.consultation}`,
    `/api/surgeries/patient/${patient._id}`,
    `/api/surgeries/${ids.surgery}`,
    `/api/hospital-admissions/patient/${patient._id}`,
    `/api/hospital-admissions/${ids.admission}`,
    `/api/biometrics/${patient._id}`,
    `/api/patients/${patient._id}/physical-records`
  ];

  // Everything a request could have written to (audit/email are side channels)
  const snapshot = async () => {
    const out = {};
    const names = (await mongoose.connection.db.listCollections().toArray()).map((c) => c.name).sort();
    for (const name of names) {
      if (['auditevents', 'emailqueues'].includes(name)) continue;
      out[name] = await mongoose.connection.collection(name).find().sort({ _id: 1 }).toArray();
    }
    return JSON.stringify(out);
  };

  const setup = async (status) => {
    provider = await makeProvider();
    patient = await makePlaceholder();
    connection = await connect(patient, provider, status);
    ids = {
      consultation: oid(), surgery: oid(), admission: oid(), physicalRecord: oid()
    };
    const db = mongoose.connection;
    // Pre-existing records (e.g. written while consent was active), inserted raw
    await db.collection('consultations').insertOne({ _id: ids.consultation, patient: patient._id, provider: provider._id, status: 'draft', attachments: [] });
    await db.collection('surgeries').insertOne({ _id: ids.surgery, patient: patient._id, provider: provider._id, surgeryType: 'x', notes: [] });
    await db.collection('hospitaladmissions').insertOne({ _id: ids.admission, patient: patient._id, provider: provider._id, hospitalName: 'x', observations: [] });
    await db.collection('physicalrecords').insertOne({ _id: ids.physicalRecord, patient: patient._id, provider: provider._id, file: { filename: 'scan.pdf' } });
  };

  describe.each(['PENDING_CONSENT', 'DECLINED', 'EXPIRED', 'WITHDRAWN'])('while consent is %s', (status) => {
    beforeEach(() => setup(status));

    it('refuses every clinical write and sharing endpoint without writing anything', async () => {
      const before = await snapshot();
      for (const [method, url, body] of writes()) {
        const res = await request(app)[method](url).set(authHeader(provider)).send(body || {});
        expect({ method, url, status: res.status, code: res.body.code })
          .toEqual({ method, url, status: 403, code: 'CONSENT_REQUIRED' });
      }
      expect(await snapshot()).toEqual(before);
    });

    it('refuses clinical reads', async () => {
      for (const url of reads()) {
        const res = await request(app).get(url).set(authHeader(provider));
        expect({ url, status: res.status, code: res.body.code }).toEqual({ url, status: 403, code: 'CONSENT_REQUIRED' });
      }
    });

    it('hides the patient\'s existing records from provider-wide lists', async () => {
      const res = await request(app).get('/api/surgeries').set(authHeader(provider));
      expect(res.status).toBe(200);
      const listed = JSON.stringify(res.body);
      expect(listed).not.toContain(String(ids.surgery));
    });

    it('keeps the patient\'s consultations out of billing, overview and the dashboard', async () => {
      const cid = String(ids.consultation);
      const practice = await Practice.create({ name: 'Clinic', owner: provider._id, members: [provider._id] });
      const admin = await makeUser({ role: 'practice_admin', practiceAdminProfile: { practiceId: practice._id, status: 'active' } });

      const overview = await request(app).get(`/api/practice-admin/patients/${patient._id}/operational-overview`).set(authHeader(admin));
      expect(overview.body.consultations).toEqual([]);
      for (const [who, url] of [[admin, '/api/practice-admin/billing'], [provider, '/api/provider/billing'], [provider, '/api/provider/dashboard']]) {
        const res = await request(app).get(url).set(authHeader(who));
        expect({ url, status: res.status }).toEqual({ url, status: 200 });
        expect(JSON.stringify(res.body)).not.toContain(cid);
      }
      const csv = await request(app).get('/api/practice-admin/billing/export/csv').set(authHeader(admin));
      expect(csv.text).not.toContain(patient.lastName);

      for (const [who, url] of [[admin, `/api/practice-admin/billing/${cid}/status`], [provider, `/api/provider/billing/${cid}/status`]]) {
        const res = await request(app).patch(url).set(authHeader(who)).send({ billingStatus: 'processed' });
        expect({ url, status: res.status }).toEqual({ url, status: 404 });
      }
    });

    it('refuses vitals, radiology and statistics reads for the patient', async () => {
      const db = mongoose.connection;
      const vitalsId = oid();
      const radiologyId = oid();
      await db.collection('medicalrecords').insertMany([
        { _id: vitalsId, recordType: 'Vitals', patient: patient._id, provider: provider._id, date: new Date() },
        { _id: radiologyId, recordType: 'RadiologyReport', patient: patient._id, provider: provider._id, date: new Date() }
      ]);

      const vitals = await request(app).get(`/api/medical-records/vitals/${vitalsId}`).set(authHeader(provider));
      expect(vitals.body.code).toBe('CONSENT_REQUIRED');

      const radiologyForPatient = await request(app)
        .get(`/api/medical-records/radiology-reports?patientId=${patient._id}`)
        .set(authHeader(provider));
      expect(radiologyForPatient.body.code).toBe('CONSENT_REQUIRED');
      const radiologyList = await request(app).get('/api/medical-records/radiology').set(authHeader(provider));
      expect(JSON.stringify(radiologyList.body)).not.toContain(String(radiologyId));

      const stats = await request(app)
        .get(`/api/medical-records/medications/statistics?patientId=${patient._id}`)
        .set(authHeader(provider));
      expect(stats.body.code).toBe('CONSENT_REQUIRED');
    });

    it('still shows that the patient exists, with only the entered details', async () => {
      await User.updateOne({ _id: patient._id }, { $set: { 'patientProfile.allergies': ['penicillin'] } });
      const res = await request(app).get(`/api/provider/patients/${patient._id}`).set(authHeader(provider));
      expect(res.status).toBe(200);
      expect(res.body.consent.status).toBe(status);
      expect(res.body.patient.firstName).toBe(patient.firstName);
      expect(res.body.patient.patientProfile.dateOfBirth).toBeDefined();
      expect(JSON.stringify(res.body)).not.toContain('penicillin');

      const list = await request(app).get('/api/provider/patients').set(authHeader(provider));
      expect(list.body.patients[0].consentStatus).toBe(status);
      expect(JSON.stringify(list.body)).not.toContain('penicillin');

      const connections = await request(app).get('/api/connections').set(authHeader(provider));
      expect(connections.status).toBe(200);
      expect(JSON.stringify(connections.body)).not.toContain('penicillin');
      expect(JSON.stringify(connections.body)).not.toContain('tokenHash');
    });
  });

  describe('when consent is ACTIVE', () => {
    beforeEach(() => setup('ACTIVE'));

    it('lets every guarded endpoint past the consent check', async () => {
      for (const [method, url, body] of writes()) {
        const res = await request(app)[method](url).set(authHeader(provider)).send(body || {});
        expect({ url, code: res.body.code }).not.toEqual({ url, code: 'CONSENT_REQUIRED' });
      }
      for (const url of reads()) {
        const res = await request(app).get(url).set(authHeader(provider));
        expect({ url, code: res.body.code }).not.toEqual({ url, code: 'CONSENT_REQUIRED' });
      }
    });

    it('creates records once consent is given', async () => {
      const res = await request(app)
        .post(`/api/biometrics/${patient._id}`)
        .set(authHeader(provider))
        .send({ weight: 70, height: 170, date: '2026-01-01' });
      expect(res.status).toBe(201);
    });
  });

  it('refuses a practice admin upload for a patient pending consent', async () => {
    await setup('PENDING_CONSENT');
    const practice = await Practice.create({ name: 'Clinic', owner: provider._id, members: [provider._id] });
    const admin = await makeUser({
      role: 'practice_admin',
      practiceAdminProfile: { practiceId: practice._id, status: 'active' }
    });
    const res = await request(app).post(`/api/patients/${patient._id}/physical-records`).set(authHeader(admin));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CONSENT_REQUIRED');
  });

  it('never auto-connects a provider to a placeholder through consultation creation', async () => {
    provider = await makeProvider();
    patient = await makePlaceholder();
    const res = await request(app)
      .post('/api/consultations')
      .set(authHeader(provider))
      .send({ patient: patient._id, general: { specialistName: 'Dr', specialty: 'GP' } });
    expect(res.status).toBe(403);
    expect(await Connection.countDocuments()).toBe(0);
  });
});

describe('Add New Patient', () => {
  it('creates a PENDING_CONSENT record and emails a single hashed consent link', async () => {
    const provider = await makeProvider();
    const res = await addPatient(provider, { email: 'nomsa@example.com' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ outcome: 'created', consentStatus: 'PENDING_CONSENT', consentEmailSent: true });

    const patient = await User.findById(res.body.patient._id);
    expect(patient.isOnusUser).toBe(false);
    const connection = await Connection.findOne({ patient: patient._id });
    expect(connection.onboardingSource).toBe('provider_initiated');
    expect(connection.consent.status).toBe('PENDING_CONSENT');

    const token = await consentTokenFor('nomsa@example.com');
    expect(connection.consent.tokenHash).toBe(sha256(token));
    expect(JSON.stringify(await Connection.find().lean())).not.toContain(token);
    expect(patient.claimTokens).toHaveLength(1);
    expect(patient.claimTokens[0].hash).toBe(sha256(await claimTokenFor('nomsa@example.com')));

    const expiresInDays = (connection.consent.tokenExpires - Date.now()) / 86400000;
    expect(expiresInDays).toBeGreaterThan(13.9);
    expect(expiresInDays).toBeLessThanOrEqual(14);
    expect(await EmailQueue.countDocuments({ to: 'nomsa@example.com' })).toBe(1);
  });

  it('records a patient without an email as pending, with no link sent', async () => {
    const provider = await makeProvider();
    const res = await addPatient(provider, {});
    expect(res.status).toBe(201);
    expect(res.body.consentEmailSent).toBe(false);
    expect((await Connection.findOne()).consent.status).toBe('PENDING_CONSENT');
  });

  it('turns an email + DOB match on a real account into an access request', async () => {
    const provider = await makeProvider();
    const existing = await makeUser({ email: 'nomsa@example.com', patientProfile: { dateOfBirth: new Date(DOB) } });
    const usersBefore = await User.countDocuments();

    const res = await addPatient(provider, { email: '  Nomsa@Example.COM ' });

    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('access_request_sent');
    expect(await User.countDocuments()).toBe(usersBefore);
    const connection = await Connection.findOne({ patient: existing._id, provider: provider._id });
    expect(connection.onboardingSource).toBe('patient_initiated');
    expect(connection.fullAccessStatus).toBe('pending');
  });

  it('reuses another provider\'s placeholder on an email + DOB match, with its own pending consent', async () => {
    const other = await makeProvider();
    const provider = await makeProvider();
    const placeholder = await makePlaceholder({ email: 'nomsa@example.com' });
    await connect(placeholder, other, 'ACTIVE');

    const res = await addPatient(provider, { email: 'nomsa@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.outcome).toBe('linked_existing_record');
    expect(String(res.body.patient._id)).toBe(String(placeholder._id));
    expect(await User.countDocuments({ email: 'nomsa@example.com' })).toBe(1);
    const mine = await Connection.findOne({ patient: placeholder._id, provider: provider._id });
    expect(mine.consent.status).toBe('PENDING_CONSENT');
  });

  it('creates a separate record with a warning when the email matches but the DOB does not', async () => {
    const provider = await makeProvider();
    await makePlaceholder({ email: 'family@example.com', patientProfile: { dateOfBirth: new Date('1960-02-02') } });

    const res = await addPatient(provider, { email: 'family@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.outcome).toBe('created');
    expect(res.body.warning).toBe('EMAIL_IN_USE_DIFFERENT_DOB');
    expect(await User.countDocuments({ email: 'family@example.com' })).toBe(2);
  });

  it('matches DOB on the calendar date regardless of time zone', async () => {
    const provider = await makeProvider();
    await makeUser({ email: 'tz@example.com', patientProfile: { dateOfBirth: new Date(DOB) } });
    const res = await addPatient(provider, { email: 'tz@example.com', dateOfBirth: `${DOB}T23:30:00-05:00` });
    expect(res.body.outcome).toBe('access_request_sent');
  });

  it('refuses to add a patient already in the provider\'s list', async () => {
    const provider = await makeProvider();
    await addPatient(provider, { email: 'nomsa@example.com' });
    const res = await addPatient(provider, { email: 'nomsa@example.com' });
    expect(res.status).toBe(409);
  });

  it('keeps emails unique among real accounts only', async () => {
    await makePlaceholder({ email: 'shared@example.com' });
    await makePlaceholder({ email: 'shared@example.com' });
    await makeUser({ email: 'shared@example.com' });
    await expect(makeUser({ email: 'shared@example.com' })).rejects.toMatchObject({ code: 11000 });
  });

  it('runs the same flow for a practice admin adding a patient for a member provider', async () => {
    const provider = await makeProvider();
    const practice = await Practice.create({ name: 'Clinic', owner: provider._id, members: [provider._id] });
    const admin = await makeUser({ role: 'practice_admin', practiceAdminProfile: { practiceId: practice._id, status: 'active' } });

    const res = await request(app)
      .post('/api/practice-admin/patients')
      .set(authHeader(admin))
      .send({ providerId: provider._id, firstName: 'A', lastName: 'B', gender: 'male', dateOfBirth: DOB, email: 'pa@example.com' });

    expect(res.status).toBe(201);
    const connection = await Connection.findOne({ provider: provider._id });
    expect(connection.consent.status).toBe('PENDING_CONSENT');
    expect(await latestEmail('pa@example.com', 'consentRequest')).not.toBeNull();

    const list = await request(app).get('/api/practice-admin/patients').set(authHeader(admin));
    expect(list.body.patients[0].consentStatus).toBe('PENDING_CONSENT');
  });
});

describe('Consent link', () => {
  let provider;
  let patientId;
  let token;

  beforeEach(async () => {
    provider = await makeProvider();
    const res = await addPatient(provider, { email: 'nomsa@example.com' });
    patientId = res.body.patient._id;
    token = await consentTokenFor('nomsa@example.com');
  });

  it('shows the request without revealing the DOB', async () => {
    const res = await request(app).get(`/api/consent/${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ patientFirstName: 'Nomsa', providerName: 'Paula Provider' });
    expect(res.body.consentText.version).toBe(CURRENT_VERSION);
    expect(JSON.stringify(res.body)).not.toContain('1990');
  });

  it('grants consent once, notifies the provider and offers claiming', async () => {
    const res = await respond(token);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.claimUrl).toMatch(/\/claim\/[0-9a-f]{64}$/);

    const connection = await Connection.findOne({ patient: patientId });
    expect(connection.consent.status).toBe('ACTIVE');
    expect(connection.consent.textVersion).toBe(CURRENT_VERSION);
    expect(connection.consent.tokenHash).toBeUndefined();
    expect(await latestEmail(provider.email, 'consentGranted')).not.toBeNull();

    const again = await respond(token);
    expect(again.status).toBe(404);
  });

  it('accepts only one of two concurrent submissions', async () => {
    const results = await Promise.all([respond(token), respond(token, { decision: 'decline' })]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 404]);
    expect((await Connection.findOne({ patient: patientId })).consent.status)
      .toBe(results.find((r) => r.status === 200).body.status);
  });

  it('records a decline and locks the record', async () => {
    const res = await respond(token, { decision: 'decline' });
    expect(res.body.status).toBe('DECLINED');
    expect(await latestEmail(provider.email, 'consentDeclined')).not.toBeNull();
    const write = await request(app).post(`/api/biometrics/${patientId}`).set(authHeader(provider)).send({});
    expect(write.body.code).toBe('CONSENT_REQUIRED');
  });

  it('accepts the DOB as a calendar date whatever the time zone', async () => {
    const res = await respond(token, { dateOfBirth: `${DOB}T23:00:00-02:00` });
    expect(res.status).toBe(200);
  });

  it('counts DOB mismatches and disables the link after five', async () => {
    for (let i = 4; i >= 1; i -= 1) {
      const res = await respond(token, { dateOfBirth: '1991-01-01' });
      expect(res.status).toBe(422);
      expect(res.body.attemptsRemaining).toBe(i);
    }
    const locked = await respond(token, { dateOfBirth: '1991-01-01' });
    expect(locked.status).toBe(423);

    const afterLock = await respond(token);
    expect(afterLock.status).toBe(404);
    expect((await Connection.findOne({ patient: patientId })).consent.status).toBe('PENDING_CONSENT');

    const detail = await request(app).get(`/api/provider/patients/${patientId}`).set(authHeader(provider));
    expect(detail.body.consent.linkLocked).toBe(true);
  });

  it('expires after 14 days and can be re-sent with a new link', async () => {
    await Connection.updateOne({ patient: patientId }, { $set: { 'consent.tokenExpires': new Date(Date.now() - 1000) } });

    const res = await respond(token);
    expect(res.status).toBe(410);
    let connection = await Connection.findOne({ patient: patientId });
    expect(connection.consent.status).toBe('EXPIRED');
    expect(connection.consent.expiredAt).toBeDefined();

    const resend = await request(app)
      .post(`/api/provider/patients/${patientId}/consent/resend`)
      .set(authHeader(provider));
    expect(resend.status).toBe(200);

    const newToken = await consentTokenFor('nomsa@example.com');
    expect(newToken).not.toBe(token);
    expect((await respond(token)).status).toBe(404);
    expect((await respond(newToken)).status).toBe(200);

    connection = await Connection.findOne({ patient: patientId });
    expect(connection.consent.status).toBe('ACTIVE');
    expect(connection.consent.resendCount).toBe(1);
  });

  it('invalidates the previous link when re-sent while pending', async () => {
    await request(app).post(`/api/provider/patients/${patientId}/consent/resend`).set(authHeader(provider));
    expect((await request(app).get(`/api/consent/${token}`)).status).toBe(404);
  });

  it('writes an append-only audit event with everything needed to evidence consent', async () => {
    await respond(token);
    await flushAudit();

    const event = await AuditEvent.findOne({ subtype: 'consent-granted' }).lean();
    expect(event.type).toBe('consent');
    expect(String(event.entity.patientId)).toBe(String(patientId));
    expect(event.context.after).toMatchObject({
      consentStatus: 'ACTIVE',
      providerId: String(provider._id),
      consentTextVersion: CURRENT_VERSION
    });
    expect(event.recorded).toBeInstanceOf(Date);
    expect(event.agent.ip).toBeTruthy();
    expect(event.agent.userAgent).toBe(UA);

    const all = JSON.stringify(await AuditEvent.find().lean());
    expect(all).not.toContain(token);
    expect(all).not.toContain('1990-04-15');

    const result = await verifyChain(await AuditEvent.find().sort({ seq: 1 }).lean());
    expect(result.valid).toBe(true);
    await expect(AuditEvent.updateOne({ _id: event._id }, { $set: { subtype: 'x' } })).rejects.toThrow(/append-only/);
  });
});

describe('Claiming a profile', () => {
  let patientId;

  beforeEach(async () => {
    const provider = await makeProvider();
    const res = await addPatient(provider, { email: 'nomsa@example.com' });
    patientId = res.body.patient._id;
  });

  it('claims in place with the emailed link, even after consent', async () => {
    await respond(await consentTokenFor('nomsa@example.com'));
    const claimToken = await claimTokenFor('nomsa@example.com');
    const usersBefore = await User.countDocuments();

    expect((await request(app).get(`/api/auth/claim/${claimToken}`)).status).toBe(200);

    const wrong = await request(app).post(`/api/auth/claim/${claimToken}`).send({ password: 'Password@123', dateOfBirth: '1991-01-01' });
    expect(wrong.status).toBe(422);

    const res = await request(app).post(`/api/auth/claim/${claimToken}`).send({ password: 'Password@123', dateOfBirth: DOB });
    expect(res.status).toBe(201);

    const user = await User.findById(patientId);
    expect(user.isOnusUser).toBe(true);
    expect(user.claimedAt).toBeDefined();
    expect(user.claimTokens).toHaveLength(0);
    expect(await User.countDocuments()).toBe(usersBefore);

    expect((await request(app).post(`/api/auth/claim/${claimToken}`).send({ password: 'Password@123', dateOfBirth: DOB })).status).toBe(404);

    const login = await request(app).post('/api/auth/login').send({ email: 'nomsa@example.com', password: 'Password@123' });
    expect(login.status).toBe(200);
  });

  it('accepts the claim link from the consent confirmation screen', async () => {
    const consent = await respond(await consentTokenFor('nomsa@example.com'));
    const claimToken = tokenFrom(consent.body.claimUrl, 'claim');
    const res = await request(app).post(`/api/auth/claim/${claimToken}`).send({ password: 'Password@123', dateOfBirth: DOB });
    expect(res.status).toBe(201);
  });

  describe('through normal sign-up', () => {
    const signUp = (body) => request(app).post('/api/auth/register').send({
      email: 'nomsa@example.com', password: 'Password@123', firstName: 'Nomsa', lastName: 'Dlamini', ...body
    });

    it('asks for the DOB instead of taking over the record by email alone', async () => {
      const res = await signUp({});
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('RECORD_EXISTS_VERIFY_DOB');
      expect((await User.findById(patientId)).isOnusUser).toBe(false);
    });

    it('creates a separate account when the DOB does not match', async () => {
      const res = await signUp({ dateOfBirth: '1991-01-01' });
      expect(res.status).toBe(201);
      expect((await User.findById(patientId)).isOnusUser).toBe(false);
      expect(await User.countDocuments({ email: 'nomsa@example.com' })).toBe(2);
    });

    it('never hands over the record on email + DOB alone: it emails a claim link instead', async () => {
      const usersBefore = await User.countDocuments();
      const res = await signUp({ dateOfBirth: DOB, password: 'Attacker@123' });
      expect(res.status).toBe(202);
      expect(res.body.code).toBe('CLAIM_LINK_SENT');
      expect(res.body.tokens).toBeUndefined();
      expect(await User.countDocuments()).toBe(usersBefore);

      const placeholder = await User.findById(patientId);
      expect(placeholder.isOnusUser).toBe(false);
      expect(placeholder.password).toBeUndefined();

      // The emailed link (sent to the record's own address) is what claims it
      const email = await latestEmail('nomsa@example.com', 'claimProfileLink');
      const claimToken = tokenFrom(email.templateData.claimUrl, 'claim');
      const claim = await request(app).post(`/api/auth/claim/${claimToken}`).send({ password: 'Password@123', dateOfBirth: DOB });
      expect(claim.status).toBe(201);
      expect((await User.findById(patientId)).isOnusUser).toBe(true);
    });

    it('sends the claim link for the record whose DOB matches when two share an email', async () => {
      const sibling = await makePlaceholder({ email: 'nomsa@example.com', patientProfile: { dateOfBirth: new Date('2012-06-01') } });
      await signUp({ dateOfBirth: '2012-06-01' });
      const email = await latestEmail('nomsa@example.com', 'claimProfileLink');
      expect(String(email.userId)).toBe(String(sibling._id));
      expect((await User.findById(sibling._id)).isOnusUser).toBe(false);
      expect((await User.findById(patientId)).isOnusUser).toBe(false);
    });
  });
});

describe('Patient consent management', () => {
  let provider;
  let patient;
  let connection;

  beforeEach(async () => {
    provider = await makeProvider();
    patient = await makeUser({ patientProfile: { dateOfBirth: new Date(DOB) } });
    connection = await connect(patient, provider, 'PENDING_CONSENT');
  });

  it('lets a signed-in patient accept a pending request and later withdraw it', async () => {
    const list = await request(app).get('/api/connections/patient/consents').set(authHeader(patient));
    expect(list.body.consents[0]).toMatchObject({ status: 'PENDING_CONSENT' });

    const accept = await request(app)
      .post(`/api/connections/patient/consent/${connection._id}/respond`)
      .set(authHeader(patient))
      .send({ decision: 'accept', textVersion: CURRENT_VERSION });
    expect(accept.body.status).toBe('ACTIVE');

    const withdraw = await request(app)
      .post(`/api/connections/patient/consent/${connection._id}/withdraw`)
      .set(authHeader(patient));
    expect(withdraw.body.status).toBe('WITHDRAWN');
    expect(await latestEmail(provider.email, 'consentWithdrawn')).not.toBeNull();

    const write = await request(app).post(`/api/biometrics/${patient._id}`).set(authHeader(provider)).send({});
    expect(write.body.code).toBe('CONSENT_REQUIRED');

    await flushAudit();
    const event = await AuditEvent.findOne({ subtype: 'consent-withdrawn' }).lean();
    expect(String(event.agent.userId)).toBe(String(patient._id));
    expect(event.context.after.consentTextVersion).toBe(CURRENT_VERSION);
  });

  it('withdraws (never deletes) when the patient removes the provider', async () => {
    await Connection.updateOne({ _id: connection._id }, { $set: { 'consent.status': 'ACTIVE' } });
    const res = await request(app).post(`/api/connections/patient/revoke/${connection._id}`).set(authHeader(patient));
    expect(res.status).toBe(200);
    expect((await Connection.findById(connection._id)).consent.status).toBe('WITHDRAWN');

    const del = await request(app).delete(`/api/connections/${connection._id}`).set(authHeader(patient));
    expect(del.status).toBe(409);
    expect(await Connection.findById(connection._id)).not.toBeNull();
  });

  it('does not let a patient act on another patient\'s consent', async () => {
    const other = await makeUser();
    const res = await request(app)
      .post(`/api/connections/patient/consent/${connection._id}/respond`)
      .set(authHeader(other))
      .send({ decision: 'accept', textVersion: CURRENT_VERSION });
    expect(res.status).toBe(409);
    expect((await Connection.findById(connection._id)).consent.status).toBe('PENDING_CONSENT');
  });
});

describe('"Patient couldn\'t consent now"', () => {
  let provider;
  let patient;

  beforeEach(async () => {
    provider = await makeProvider();
    patient = await makePlaceholder();
    await connect(patient, provider, 'PENDING_CONSENT');
  });

  const defer = (body) => request(app)
    .post(`/api/provider/patients/${patient._id}/consent/deferral`)
    .set(authHeader(provider))
    .send(body);

  it('requires a valid reason, and a note for "other"', async () => {
    expect((await defer({})).status).toBe(400);
    expect((await defer({ reason: 'busy' })).status).toBe(400);
    expect((await defer({ reason: 'other' })).status).toBe(400);
  });

  it('records the reason without changing consent, and audits the code but not the note', async () => {
    expect((await defer({ reason: 'no_phone' })).status).toBe(201);
    expect((await defer({ reason: 'other', note: 'patient in pain' })).status).toBe(201);

    const connection = await Connection.findOne({ patient: patient._id });
    expect(connection.consent.status).toBe('PENDING_CONSENT');
    expect(connection.consent.deferrals.map((d) => d.reason)).toEqual(['no_phone', 'other']);

    await flushAudit();
    const events = await AuditEvent.find({ subtype: 'consent-deferred' }).lean();
    expect(events.map((e) => e.outcomeDesc).sort()).toEqual(['no_phone', 'other']);
    expect(JSON.stringify(events)).not.toContain('patient in pain');
  });
});

describe('Consent report', () => {
  it('reports deferral, consent, expiry and claim rates and time to consent', async () => {
    const provider = await makeProvider();
    const admin = await makeUser({ role: 'admin' });
    const sent = new Date('2026-09-01T08:00:00Z');
    const hours = (h) => new Date(sent.getTime() + h * 3600000);

    const seed = async (status, consent = {}, patientOverrides = {}) => {
      const patient = await makePlaceholder(patientOverrides);
      await new Connection({
        patient: patient._id,
        provider: provider._id,
        initiatedBy: provider._id,
        onboardingSource: 'provider_initiated',
        consent: { status, firstInviteSentAt: sent, ...consent }
      }).save();
    };

    await seed('ACTIVE', { respondedAt: hours(0.5) }, { isOnusUser: true, password: 'Password@123', claimedAt: hours(1) });
    await seed('ACTIVE', { respondedAt: hours(30), deferrals: [{ reason: 'no_phone' }] });
    await seed('WITHDRAWN', { respondedAt: hours(2) });
    await seed('DECLINED', { respondedAt: hours(1) });
    await seed('EXPIRED', { expiredAt: hours(336), deferrals: [{ reason: 'no_email_access' }, { reason: 'other', note: 'x' }] });
    await seed('PENDING_CONSENT', { firstInviteSentAt: undefined, deferrals: [{ reason: 'no_email_address' }] });
    // Path-1 connections are excluded
    await connect(await makeUser(), provider, 'ACTIVE', 'patient_initiated');

    const res = await request(app).get('/api/admin/reports/consent').set(authHeader(admin));
    expect(res.status).toBe(200);
    const { report } = res.body;

    expect(report.totals).toMatchObject({ onboardings: 6, invitesSent: 5, noEmailAtOnboarding: 1, granted: 3 });
    expect(report.rates.couldNotConsentNow).toBeCloseTo(3 / 6);
    expect(report.rates.consent).toBeCloseTo(3 / 5);
    expect(report.rates.expiry).toBeCloseTo(1 / 5);
    expect(report.rates.claim).toBeCloseTo(1 / 3);
    expect(report.timeToConsent.count).toBe(3);
    expect(report.timeToConsent.medianMs).toBe(2 * 3600000);
    expect(report.timeToConsent.histogram.map((b) => b.count)).toEqual([1, 1, 1, 0, 0, 0]);
    const reasons = Object.fromEntries(report.deferrals.reasons.map((r) => [r.reason, r.onboardings]));
    expect(reasons).toMatchObject({ no_phone: 1, no_email_access: 1, no_email_address: 1, declined_verbally: 0, other: 1 });

    const forbidden = await request(app).get('/api/admin/reports/consent').set(authHeader(provider));
    expect(forbidden.status).toBe(403);
  });
});
