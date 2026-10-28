/**
 * Server-managed file references can't be pointed at other files: profile
 * images, consultation attachments and license files are only ever resolved
 * from what the server itself stored, and multipart bodies are sanitized
 * like JSON ones.
 */

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Connection = require('../models/Connection');
const Consultation = require('../models/Consultation');
const { sanitizeMultipartBody } = require('../middleware/upload.middleware');
const auditService = require('../services/audit.service');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setup');

const UPLOADS = path.join(__dirname, '../uploads');

let seq = 0;
const makeUser = async (overrides = {}) => {
  seq += 1;
  const user = new User({
    email: `us-user${seq}@example.com`,
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

const makeProvider = (overrides = {}) => makeUser({ role: 'provider', providerProfile: { isVerified: true }, ...overrides });
const authHeader = (user) => ({ Authorization: `Bearer ${user.generateAuthToken()}` });

// A file another user owns, which no request by the attacker may delete
const writeVictimFile = (dir, name) => {
  fs.mkdirSync(path.join(UPLOADS, dir), { recursive: true });
  const filePath = path.join(UPLOADS, dir, name);
  fs.writeFileSync(filePath, 'victim');
  return filePath;
};

const created = [];

beforeAll(async () => {
  await setupTestDB();
  await User.init();
});

beforeEach(async () => {
  await auditService.flush();
  await clearDatabase();
  await auditService.init();
});

afterEach(() => {
  created.splice(0).forEach((f) => fs.rmSync(f, { force: true }));
});

afterAll(async () => {
  await auditService.flush();
  await teardownTestDB();
});

describe('Profile images', () => {
  it('cannot be pointed at another user\'s file through a profile update', async () => {
    const victimFile = writeVictimFile('profile-images', `profilePicture-victim-${Date.now()}.png`);
    created.push(victimFile);
    const victim = await makeUser({ profileImage: `/api/files/profile-images/${path.basename(victimFile)}` });
    const attacker = await makeUser();

    await request(app).put('/api/users/profile').set(authHeader(attacker))
      .send({ firstName: 'Mallory', profileImage: victim.profileImage })
      .expect(200);

    const saved = await User.findById(attacker._id);
    expect(saved.firstName).toBe('Mallory');
    expect(saved.profileImage).toBeNull();

    await request(app).delete('/api/users/profile-picture').set(authHeader(attacker));
    await request(app).delete(`/api/files/profile-images/${path.basename(victimFile)}`).set(authHeader(attacker));
    expect(fs.existsSync(victimFile)).toBe(true);
  });
});

describe('Consultation attachments', () => {
  let provider;
  let consultation;

  beforeEach(async () => {
    provider = await makeProvider();
    const patient = await makeUser();
    await new Connection({
      patient: patient._id, provider: provider._id, initiatedBy: provider._id,
      onboardingSource: 'patient_initiated', consent: { status: 'ACTIVE' }
    }).save();
    consultation = await Consultation.create({
      patient: patient._id, provider: provider._id, status: 'draft',
      general: { specialistName: 'Dr', specialty: 'GP' }
    });
  });

  it('are never taken from an update payload', async () => {
    const forged = [{ filename: 'x.pdf', originalName: 'x.pdf', mimetype: 'application/pdf', size: 1, path: '/etc/hosts' }];
    for (const url of [`/api/consultations/${consultation._id}`, `/api/provider/consultations/${consultation._id}`]) {
      await request(app).put(url).set(authHeader(provider)).send({ status: 'draft', attachments: forged });
    }
    expect((await Consultation.findById(consultation._id)).attachments).toHaveLength(0);
  });

  it('delete only the file in the consultations folder, never a stored path', async () => {
    // e.g. an entry tampered with before payloads were filtered
    const outside = path.join(UPLOADS, `outside-${Date.now()}.txt`);
    fs.writeFileSync(outside, 'keep');
    created.push(outside);
    await Consultation.updateOne(
      { _id: consultation._id },
      { $push: { attachments: { filename: 'missing.pdf', originalName: 'm.pdf', mimetype: 'application/pdf', size: 1, path: outside } } }
    );
    const { attachments } = await Consultation.findById(consultation._id);

    const res = await request(app)
      .delete(`/api/consultations/${consultation._id}/attachments/${attachments[0]._id}`)
      .set(authHeader(provider));

    expect(res.status).toBe(200);
    expect(fs.existsSync(outside)).toBe(true);
  });
});

describe('License files', () => {
  it('match the provider\'s own license exactly, not as a substring', async () => {
    const victimFile = writeVictimFile('licenses', `licenseFile-victim-${Date.now()}.pdf`);
    created.push(victimFile);
    const name = path.basename(victimFile);
    await makeProvider({ providerProfile: { isVerified: true, practiceLicense: `/uploads/licenses/${name}` } });
    const attacker = await makeProvider({
      providerProfile: { isVerified: true, practiceLicense: `/uploads/licenses/mine.pdf ${name}` }
    });

    expect((await request(app).get(`/api/files/licenses/${name}`).set(authHeader(attacker))).status).toBe(403);
    expect((await request(app).delete(`/api/files/licenses/${name}`).set(authHeader(attacker))).status).toBe(403);
    expect(fs.existsSync(victimFile)).toBe(true);
  });
});

describe('Multipart bodies', () => {
  it('have operator keys stripped like JSON bodies', () => {
    const req = { body: { email: { $ne: null }, providerId: { $gt: '' }, nested: { ok: 1, $where: 'x' } } };
    sanitizeMultipartBody(req, {}, () => {});
    expect(req.body).toEqual({ email: {}, providerId: {}, nested: { ok: 1 } });
  });
});
