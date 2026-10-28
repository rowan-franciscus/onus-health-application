/**
 * Offline consent: Add New Patient with a signed paper consent form instead
 * of (or as well as) an email. Covers the upload path to ACTIVE consent, the
 * email path staying unchanged, validation of type and size, file access
 * control, the audit trail and the consent report.
 */

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Connection = require('../models/Connection');
const EmailQueue = require('../models/EmailQueue');
const AuditEvent = require('../models/AuditEvent');
const PhysicalRecord = require('../models/PhysicalRecord');
const Practice = require('../models/Practice');
const auditService = require('../services/audit.service');
const { verifyChain } = require('../utils/auditChain');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setup');

const DOB = '1950-06-01';
const UPLOAD_DIR = path.join(__dirname, '../uploads/physical-records');

const flushAudit = async () => {
  await new Promise((resolve) => setImmediate(resolve));
  await auditService.flush();
};

// Minimal files: only the leading bytes matter to the server
const pad = (head, size = 256) => Buffer.concat([head, Buffer.alloc(Math.max(0, size - head.length), 0x20)]);
const FILES = {
  jpeg: { buffer: pad(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])), filename: 'form.jpg', contentType: 'image/jpeg' },
  png: { buffer: pad(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])), filename: 'form.png', contentType: 'image/png' },
  pdf: { buffer: pad(Buffer.from('%PDF-1.4\n')), filename: 'form.pdf', contentType: 'application/pdf' },
  heic: { buffer: pad(Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic')])), filename: 'IMG_0001.HEIC', contentType: 'image/heic' }
};

let seq = 0;
const makeUser = async (overrides = {}) => {
  seq += 1;
  const user = new User({
    email: `cf-user${seq}@example.com`,
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

const makeProvider = () => makeUser({ role: 'provider', firstName: 'Paula', lastName: 'Provider', providerProfile: { isVerified: true } });

const authHeader = (user) => ({ Authorization: `Bearer ${user.generateAuthToken()}` });

const PATIENT_FIELDS = { firstName: 'Gogo', lastName: 'Shikongo', gender: 'female', dateOfBirth: DOB };

/** Multipart Add New Patient, with an optional consent form. */
const addPatient = (user, fields = {}, file, url = '/api/patients/register-new') => {
  let req = request(app).post(url).set(authHeader(user));
  for (const [key, value] of Object.entries({ ...PATIENT_FIELDS, ...fields })) {
    req = req.field(key, String(value));
  }
  if (file) {
    req = req.attach('consentForm', file.buffer, { filename: file.filename, contentType: file.contentType });
  }
  return req;
};

const storedForms = () => (fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR).filter((f) => f.startsWith('consentForm-')) : []);

let formsBefore;

beforeAll(async () => {
  await setupTestDB();
  await User.init();
  await Connection.init();
});

beforeEach(async () => {
  await auditService.flush();
  await clearDatabase();
  await auditService.init();
  formsBefore = new Set(storedForms());
});

afterEach(() => {
  // Remove only the files this test wrote
  for (const f of storedForms()) {
    if (!formsBefore.has(f)) fs.unlinkSync(path.join(UPLOAD_DIR, f));
  }
});

afterAll(async () => {
  await auditService.flush();
  await teardownTestDB();
});

describe('Add New Patient with a signed consent form', () => {
  it('consents a patient with no email straight away, sending nothing', async () => {
    const provider = await makeProvider();
    const res = await addPatient(provider, {}, FILES.jpeg);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      success: true,
      outcome: 'created',
      consentStatus: 'ACTIVE',
      consentMethod: 'uploaded_form',
      consentEmailSent: false,
      claimEmailSent: false
    });
    expect(res.body.patient.email).toBeNull();

    const connection = await Connection.findOne({ patient: res.body.patient._id, provider: provider._id });
    expect(connection.consent.status).toBe('ACTIVE');
    expect(connection.consent.method).toBe('uploaded_form');
    expect(connection.consent.respondedAt).toBeInstanceOf(Date);
    expect(String(connection.consent.form.uploadedBy)).toBe(String(provider._id));
    expect(connection.consent.form.uploadedAt).toBeInstanceOf(Date);
    expect(connection.consent.tokenHash).toBeUndefined();

    const record = await PhysicalRecord.findById(connection.consent.form.record);
    expect(record.documentType).toBe('consent_form');
    expect(String(record.patient)).toBe(String(res.body.patient._id));
    expect(record.file.mimetype).toBe('image/jpeg');
    expect(fs.existsSync(record.file.path)).toBe(true);

    expect(await EmailQueue.countDocuments()).toBe(0);
  });

  it('accepts PNG, PDF and HEIC forms too', async () => {
    const provider = await makeProvider();
    for (const [i, file] of [FILES.png, FILES.pdf, FILES.heic].entries()) {
      const res = await addPatient(provider, { lastName: `Patient${i}` }, file);
      expect({ file: file.filename, status: res.status }).toEqual({ file: file.filename, status: 201 });
    }
    expect((await PhysicalRecord.find().select('file.mimetype').lean()).map((r) => r.file.mimetype).sort())
      .toEqual(['application/pdf', 'image/heic', 'image/png']);
  });

  it('logs the same consent-granted audit event, with method, provider and time', async () => {
    const provider = await makeProvider();
    const res = await addPatient(provider, {}, FILES.pdf);
    await flushAudit();

    const event = await AuditEvent.findOne({ subtype: 'consent-granted' }).lean();
    expect(event.type).toBe('consent');
    expect(String(event.entity.patientId)).toBe(String(res.body.patient._id));
    expect(String(event.agent.userId)).toBe(String(provider._id));
    expect(event.agent.role).toBe('provider');
    expect(event.context.before).toEqual({ consentStatus: 'PENDING_CONSENT' });
    expect(event.context.after).toMatchObject({
      consentStatus: 'ACTIVE',
      providerId: String(provider._id),
      consentMethod: 'uploaded_form',
      consentFormRecordId: String(res.body.consentFormRecordId),
      uploadedBy: String(provider._id)
    });
    expect(new Date(event.context.after.uploadedAt).getTime()).not.toBeNaN();
    expect(event.recorded).toBeInstanceOf(Date);
    expect(JSON.stringify(event)).not.toContain(DOB);

    const result = await verifyChain(await AuditEvent.find().sort({ seq: 1 }).lean());
    expect(result.valid).toBe(true);
  });

  it('creates several patients without email with no unique-index clash', async () => {
    await User.syncIndexes();
    const provider = await makeProvider();
    for (const name of ['One', 'Two', 'Three']) {
      expect((await addPatient(provider, { lastName: name }, FILES.jpeg)).status).toBe(201);
    }
    expect(await User.countDocuments({ role: 'patient', email: { $exists: false } })).toBe(3);
  });

  it('with an email as well: consents from the form and emails only a claim link', async () => {
    const provider = await makeProvider();
    const res = await addPatient(provider, { email: 'gogo@example.com' }, FILES.jpeg);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ consentStatus: 'ACTIVE', consentEmailSent: false, claimEmailSent: true });
    expect(await EmailQueue.countDocuments({ template: 'consentRequest' })).toBe(0);

    const emails = await EmailQueue.find({ to: 'gogo@example.com' });
    expect(emails).toHaveLength(1);
    expect(emails[0].template).toBe('consentFormClaimInvite');
    expect(emails[0].templateData.consentUrl).toBeUndefined();

    // The claim link sets up the patient's account
    const claimToken = emails[0].templateData.claimUrl.split('/claim/')[1];
    const claim = await request(app).post(`/api/auth/claim/${claimToken}`).send({ password: 'Password@123', dateOfBirth: DOB });
    expect(claim.status).toBe(201);
    expect((await User.findById(res.body.patient._id)).isOnusUser).toBe(true);
  });

  it('works the same through the Practice Admin endpoint', async () => {
    const provider = await makeProvider();
    const practice = await Practice.create({ name: 'Clinic', owner: provider._id, members: [provider._id] });
    const admin = await makeUser({ role: 'practice_admin', practiceAdminProfile: { practiceId: practice._id, status: 'active' } });

    const res = await addPatient(admin, { providerId: provider._id }, FILES.png, '/api/practice-admin/patients');

    expect(res.status).toBe(201);
    const connection = await Connection.findOne({ provider: provider._id });
    expect(connection.consent.status).toBe('ACTIVE');
    expect(String(connection.consent.form.uploadedBy)).toBe(String(admin._id));
    expect(await EmailQueue.countDocuments()).toBe(0);
  });

  it('does not use the form when the email + DOB match a real account', async () => {
    const provider = await makeProvider();
    const existing = await makeUser({ email: 'real@example.com', patientProfile: { dateOfBirth: new Date(DOB) } });

    const res = await addPatient(provider, { email: 'real@example.com' }, FILES.jpeg);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ outcome: 'access_request_sent', consentFormIgnored: true });
    const connection = await Connection.findOne({ patient: existing._id, provider: provider._id });
    expect(connection.onboardingSource).toBe('patient_initiated');
    expect(await PhysicalRecord.countDocuments()).toBe(0);
    expect(storedForms().filter((f) => !formsBefore.has(f))).toHaveLength(0);
  });
});

describe('Add New Patient without a consent form (unchanged email path)', () => {
  it('still creates a pending record and emails the consent request, as JSON', async () => {
    const provider = await makeProvider();
    const res = await request(app)
      .post('/api/patients/register-new')
      .set(authHeader(provider))
      .send({ ...PATIENT_FIELDS, email: 'email@example.com' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ outcome: 'created', consentStatus: 'PENDING_CONSENT', consentEmailSent: true });
    expect(res.body.consentMethod).toBeUndefined();
    const connection = await Connection.findOne();
    expect(connection.consent.status).toBe('PENDING_CONSENT');
    expect(connection.consent.method).toBeUndefined();
    expect(await EmailQueue.countDocuments({ to: 'email@example.com', template: 'consentRequest' })).toBe(1);
    expect(await PhysicalRecord.countDocuments()).toBe(0);
  });

  it('does the same when sent as multipart without a file', async () => {
    const provider = await makeProvider();
    const res = await addPatient(provider, { email: 'multi@example.com' });
    expect(res.status).toBe(201);
    expect(res.body.consentStatus).toBe('PENDING_CONSENT');
    expect(await EmailQueue.countDocuments({ template: 'consentRequest' })).toBe(1);
  });

  it('refuses neither an email nor a form', async () => {
    const provider = await makeProvider();
    const res = await addPatient(provider, {});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Enter the patient's email address or attach their signed consent form.");
    expect(await User.countDocuments({ role: 'patient' })).toBe(0);
  });
});

describe('Consent form validation', () => {
  const expectNothingCreated = async () => {
    expect(await User.countDocuments({ role: 'patient' })).toBe(0);
    expect(await Connection.countDocuments()).toBe(0);
    expect(await PhysicalRecord.countDocuments()).toBe(0);
    expect(storedForms().filter((f) => !formsBefore.has(f))).toHaveLength(0);
  };

  it('rejects a disallowed file type', async () => {
    const provider = await makeProvider();
    const docx = { buffer: pad(Buffer.from('PK\u0003\u0004')), filename: 'form.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    const res = await addPatient(provider, {}, docx);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/JPEG, PNG, HEIC image or a PDF/);
    await expectNothingCreated();
  });

  it('rejects content that does not match the declared type', async () => {
    const provider = await makeProvider();
    const fake = { buffer: pad(Buffer.from('just some text, not an image')), filename: 'form.png', contentType: 'image/png' };
    const res = await addPatient(provider, {}, fake);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/JPEG, PNG, HEIC image or a PDF/);

    const pdfAsJpeg = { ...FILES.pdf, filename: 'form.jpg', contentType: 'image/jpeg' };
    expect((await addPatient(provider, {}, pdfAsJpeg)).status).toBe(400);
    await expectNothingCreated();
  });

  it('rejects a file over 10 MB', async () => {
    const provider = await makeProvider();
    const big = { ...FILES.jpeg, buffer: pad(FILES.jpeg.buffer, 10 * 1024 * 1024 + 1) };
    const res = await addPatient(provider, {}, big);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Maximum size is 10MB/);
    await expectNothingCreated();
  });

  it('accepts a file of exactly 10 MB', async () => {
    const provider = await makeProvider();
    const max = { ...FILES.jpeg, buffer: pad(FILES.jpeg.buffer, 10 * 1024 * 1024) };
    expect((await addPatient(provider, {}, max)).status).toBe(201);
  });
});

describe('A patient consented by uploaded form', () => {
  let provider;
  let patientId;
  let record;

  beforeEach(async () => {
    provider = await makeProvider();
    const res = await addPatient(provider, {}, FILES.pdf);
    patientId = res.body.patient._id;
    record = await PhysicalRecord.findById(res.body.consentFormRecordId);
  });

  it('passes consent-gated features exactly like an email consent', async () => {
    const biometric = await request(app)
      .post(`/api/biometrics/${patientId}`)
      .set(authHeader(provider))
      .send({ weight: 70, height: 170, date: '2026-01-01' });
    expect(biometric.status).toBe(201);

    const records = await request(app).get(`/api/patients/${patientId}/physical-records`).set(authHeader(provider));
    expect(records.status).toBe(200);
    expect(records.body.records.map((r) => r.documentType)).toEqual(['consent_form']);

    const patients = await request(app).get('/api/provider/patients').set(authHeader(provider));
    expect(patients.status).toBe(200);
    expect(JSON.stringify(patients.body)).toContain(String(patientId));
  });

  it('shows the consent method and the form on the provider\'s patient view', async () => {
    const res = await request(app).get(`/api/provider/patients/${patientId}`).set(authHeader(provider));
    expect(res.status).toBe(200);
    expect(res.body.consent).toMatchObject({ status: 'ACTIVE', method: 'uploaded_form', canResend: false });
    expect(res.body.consent.form.viewUrl).toBe(`/api/files/physical-records/${record.file.filename}?inline=true`);
  });

  it('lets only authorised users open the form', async () => {
    const url = `/api/files/physical-records/${record.file.filename}`;
    expect((await request(app).get(url).set(authHeader(provider))).status).toBe(200);
    expect((await request(app).get(url).set(authHeader(await makeProvider()))).status).toBe(403);
    expect((await request(app).get(url).set(authHeader(await makeUser()))).status).toBe(403);
    expect((await request(app).get(url)).status).toBe(401);
    // Never served statically
    expect((await request(app).get(`/uploads/physical-records/${record.file.filename}`)).status).toBe(404);
  });

  it('never lets the form be deleted', async () => {
    const admin = await makeUser({ role: 'admin' });
    const byRecord = await request(app)
      .delete(`/api/patients/${patientId}/physical-records/${record._id}`)
      .set(authHeader(provider));
    expect(byRecord.status).toBe(403);
    const byFile = await request(app)
      .delete(`/api/files/physical-records/${record.file.filename}`)
      .set(authHeader(admin));
    expect(byFile.status).toBe(403);
    expect(await PhysicalRecord.exists({ _id: record._id })).toBeTruthy();
    expect(fs.existsSync(record.file.path)).toBe(true);
  });

  it('skips consultation emails to the patient without failing', async () => {
    const emailService = require('../services/email.service');
    expect(await emailService.sendTemplateEmail(undefined, 'consultationCompleted', {}, { queue: true })).toBe(false);
    expect(await EmailQueue.countDocuments()).toBe(0);
  });
});

describe('Consent report', () => {
  it('counts form consents as granted without inflating the email consent rate', async () => {
    const provider = await makeProvider();
    const admin = await makeUser({ role: 'admin' });
    await addPatient(provider, { lastName: 'Form' }, FILES.jpeg);
    await addPatient(provider, { lastName: 'FormEmail', email: 'fe@example.com' }, FILES.jpeg);
    await addPatient(provider, { lastName: 'Email', email: 'e@example.com' });

    const res = await request(app).get('/api/admin/reports/consent').set(authHeader(admin));
    expect(res.status).toBe(200);
    expect(res.body.report.totals).toMatchObject({ onboardings: 3, invitesSent: 1, noEmailAtOnboarding: 1, granted: 2, grantedByForm: 2 });
    expect(res.body.report.rates.consent).toBe(0);
  });
});
