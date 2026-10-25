/**
 * Vitals captured with a consultation. Consultation creation runs in a
 * transaction, so this suite uses an in-memory replica set.
 */

process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Connection = require('../models/Connection');
const VitalsRecord = require('../models/VitalsRecord');
const auditService = require('../services/audit.service');
const { clearDatabase } = require('./setup');

let replSet;
let seq = 0;

const makeUser = async (overrides = {}) => {
  seq += 1;
  const user = new User({
    email: `vitals${seq}@example.com`,
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

const authHeader = (user) => ({ Authorization: `Bearer ${user.generateAuthToken()}` });

// Blank fields arrive as empty strings, as the consultation form sends them
const blankVitals = () => ({
  heartRate: { value: '' },
  bloodPressure: { systolic: '', diastolic: '' },
  bodyTemperature: { value: '' },
  respiratoryRate: { value: '' },
  haemoglobin: { value: '' },
  bloodGlucose: { value: '' },
  bloodOxygenSaturation: { value: '' }
});

let provider;
let patient;

const createConsultation = (vitals) => request(app)
  .post('/api/consultations')
  .set(authHeader(provider))
  .send({
    patient: patient._id,
    status: 'draft',
    general: { specialistName: 'Dr', specialty: 'GP' },
    vitals
  });

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  await User.init();
  await Connection.init();
});

beforeEach(async () => {
  await auditService.flush();
  await clearDatabase();
  await auditService.init();
  provider = await makeUser({ role: 'provider', providerProfile: { isVerified: true } });
  patient = await makeUser();
  await new Connection({
    patient: patient._id,
    provider: provider._id,
    initiatedBy: provider._id,
    onboardingSource: 'patient_initiated',
    consent: { status: 'ACTIVE' }
  }).save();
});

afterAll(async () => {
  await auditService.flush();
  await mongoose.disconnect();
  await replSet.stop();
});

describe('Consultation vitals', () => {
  it('saves a consultation whose only vital is blood pressure', async () => {
    const res = await createConsultation({ ...blankVitals(), bloodPressure: { systolic: '128', diastolic: '84' } });
    expect(res.status).toBe(201);

    const vitals = await VitalsRecord.findOne({ consultation: res.body._id }).lean();
    expect(vitals).not.toBeNull();
    expect(vitals.bloodPressure).toMatchObject({ systolic: 128, diastolic: 84 });
  });

  it('creates no vitals record when every field is blank', async () => {
    const res = await createConsultation(blankVitals());
    expect(res.status).toBe(201);
    expect(await VitalsRecord.countDocuments()).toBe(0);
  });
});
