/**
 * Audit Trail Tests
 * Covers: event creation per event type, append-only enforcement,
 * role-scoped access to the query endpoint, hash-chain tamper detection,
 * failed-access dedupe, and write-failure resilience.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Connection = require('../models/Connection');
const AuditEvent = require('../models/AuditEvent');
const { Vitals, Medication } = require('../models');
const auditService = require('../services/audit.service');
const { verifyChain } = require('../utils/auditChain');
const logger = require('../utils/logger');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setup');

// Let res.on('finish') handlers run, then drain the audit queue
const flushAudit = async () => {
  await new Promise((resolve) => setImmediate(resolve));
  await auditService.flush();
};

const createUser = async (overrides = {}) => {
  const user = new User({
    email: `user${Math.random().toString(36).slice(2)}@example.com`,
    password: 'Password@123',
    firstName: 'Test',
    lastName: 'User',
    role: 'patient',
    isEmailVerified: true,
    ...overrides
  });
  await user.save();
  return user;
};

beforeAll(async () => {
  await setupTestDB();
});

beforeEach(async () => {
  await auditService.flush();
  await clearDatabase();
  // Reload the chain tip after the collection was wiped
  await auditService.init();
});

afterAll(async () => {
  await auditService.flush();
  await teardownTestDB();
});

describe('Audit trail', () => {
  describe('authentication events', () => {
    it('logs a login-success event with actor, IP and user agent', async () => {
      const user = await createUser();

      await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'audit-test-agent')
        .send({ email: user.email, password: 'Password@123' })
        .expect(200);

      await flushAudit();

      const event = await AuditEvent.findOne({ subtype: 'login-success' }).lean();
      expect(event).toBeTruthy();
      expect(event.type).toBe('auth');
      expect(event.outcome).toBe('0');
      expect(String(event.agent.userId)).toBe(String(user._id));
      expect(event.agent.ip).toBeTruthy();
      expect(event.agent.userAgent).toBe('audit-test-agent');
      expect(event.recorded).toBeInstanceOf(Date);
    });

    it('logs a login-failure event without any trace of the password', async () => {
      const user = await createUser();
      const submittedPassword = 'WrongSecret@999';

      await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: submittedPassword })
        .expect(400);

      await flushAudit();

      const event = await AuditEvent.findOne({ subtype: 'login-failure' }).lean();
      expect(event).toBeTruthy();
      expect(event.outcome).toBe('8');
      expect(event.outcomeDesc).toBe('invalid-password');
      expect(JSON.stringify(event)).not.toContain(submittedPassword);
    });

    it('logs a logout event', async () => {
      const user = await createUser();
      const token = user.generateAuthToken();

      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await flushAudit();

      const event = await AuditEvent.findOne({ subtype: 'logout' }).lean();
      expect(event).toBeTruthy();
      expect(String(event.agent.userId)).toBe(String(user._id));
    });
  });

  describe('clinical write events (model plugin)', () => {
    it('logs create, update and delete of a clinical record with the patient id', async () => {
      const patient = await createUser();
      const provider = await createUser({ role: 'provider' });

      const vitals = new Vitals({
        patient: patient._id,
        provider: provider._id,
        heartRate: { value: 72 }
      });
      await vitals.save();

      vitals.set('heartRate.value', 80);
      await vitals.save();

      await vitals.deleteOne();
      await flushAudit();

      const events = await AuditEvent.find({ 'entity.resourceId': vitals._id })
        .sort({ seq: 1 })
        .lean();
      expect(events.map((e) => e.subtype)).toEqual([
        'record-create',
        'record-update',
        'record-delete'
      ]);
      events.forEach((event) => {
        expect(event.type).toBe('data');
        expect(event.entity.resourceType).toBe('Vitals');
        expect(String(event.entity.patientId)).toBe(String(patient._id));
      });
      // Update events record modified field NAMES, never values
      const update = events[1];
      expect(update.context.modifiedFields).toContain('heartRate.value');
      // Only field names are recorded — never the clinical value
      expect(JSON.stringify(update.context)).not.toContain('80');
    });

    it('logs one delete event per document on deleteMany (bulk recreate path)', async () => {
      const patient = await createUser();
      const consultationId = new mongoose.Types.ObjectId();

      await Medication.create([
        { patient: patient._id, consultation: consultationId, name: 'MedA' },
        { patient: patient._id, consultation: consultationId, name: 'MedB' }
      ]);
      await flushAudit();

      await Medication.deleteMany({ consultation: consultationId });
      await flushAudit();

      const deletes = await AuditEvent.find({
        subtype: 'record-delete',
        'entity.resourceType': 'Medication'
      }).lean();
      expect(deletes).toHaveLength(2);
      deletes.forEach((event) => {
        expect(String(event.entity.patientId)).toBe(String(patient._id));
        // No clinical content leaks into the event
        expect(JSON.stringify(event)).not.toContain('MedA');
        expect(JSON.stringify(event)).not.toContain('MedB');
      });
    });
  });

  describe('consent lifecycle events', () => {
    it('logs the full connection lifecycle including limited-to-full escalation', async () => {
      const patient = await createUser();
      const provider = await createUser({ role: 'provider' });

      const created = new Connection({
        patient: patient._id,
        provider: provider._id,
        initiatedBy: provider._id
      });
      await created.save();

      // Reload (as controllers do) so the plugin snapshots the prior state
      let connection = await Connection.findById(created._id);
      await connection.requestFullAccess();

      connection = await Connection.findById(created._id);
      await connection.approveFullAccess();

      connection = await Connection.findById(created._id);
      await connection.revokeAccess();

      await Connection.findByIdAndDelete(created._id);
      await flushAudit();

      const events = await AuditEvent.find({ type: 'consent' }).sort({ seq: 1 }).lean();
      const subtypes = events.map((e) => e.subtype);
      expect(subtypes).toEqual([
        'connection-created',
        'consent-requested',
        'consent-approved',
        'access-escalated',
        'consent-revoked',
        'consent-revoked'
      ]);

      const escalation = events.find((e) => e.subtype === 'access-escalated');
      expect(escalation.context.before).toMatchObject({ accessLevel: 'limited' });
      expect(escalation.context.after).toMatchObject({
        accessLevel: 'full',
        fullAccessStatus: 'approved'
      });
      events.forEach((event) => {
        expect(String(event.entity.patientId)).toBe(String(patient._id));
        expect(String(event.context.connectionId)).toBe(String(created._id));
      });
    });
  });

  describe('append-only enforcement', () => {
    const insertEvent = async () => {
      // Direct model insert only for testing the schema guards; application
      // code must always go through the audit service.
      return AuditEvent.create({
        seq: 0,
        type: 'auth',
        subtype: 'login-success',
        action: 'E',
        outcome: '0',
        prevHash: 'GENESIS',
        hash: 'x'.repeat(64)
      });
    };

    it('rejects every update and delete operation', async () => {
      const event = await insertEvent();

      await expect(
        AuditEvent.updateOne({ _id: event._id }, { subtype: 'tampered' })
      ).rejects.toThrow(/append-only/);
      await expect(
        AuditEvent.findOneAndUpdate({ _id: event._id }, { subtype: 'tampered' })
      ).rejects.toThrow(/append-only/);
      await expect(AuditEvent.deleteOne({ _id: event._id })).rejects.toThrow(/append-only/);
      await expect(AuditEvent.deleteMany({})).rejects.toThrow(/append-only/);
      await expect(AuditEvent.findOneAndDelete({ _id: event._id })).rejects.toThrow(/append-only/);
      await expect(AuditEvent.replaceOne({ _id: event._id }, {})).rejects.toThrow(/append-only/);

      const doc = await AuditEvent.findById(event._id);
      doc.subtype = 'tampered';
      await expect(doc.save()).rejects.toThrow(/append-only/);
      await expect(doc.deleteOne()).rejects.toThrow(/append-only/);

      const untouched = await AuditEvent.findById(event._id).lean();
      expect(untouched.subtype).toBe('login-success');
    });
  });

  describe('audit log query endpoint', () => {
    it('allows admins, blocks every other role, and audits both', async () => {
      const admin = await createUser({ role: 'admin' });
      const patient = await createUser({ role: 'patient' });
      const provider = await createUser({ role: 'provider' });

      // Generate an event to query
      await request(app)
        .post('/api/auth/login')
        .send({ email: patient.email, password: 'Password@123' })
        .expect(200);
      await flushAudit();

      // Non-admin roles are rejected
      for (const user of [patient, provider]) {
        await request(app)
          .get('/api/admin/audit-logs')
          .set('Authorization', `Bearer ${user.generateAuthToken()}`)
          .expect(403);
      }
      await flushAudit();

      // The rejections themselves were audited
      const denied = await AuditEvent.find({ subtype: 'access-denied' }).lean();
      expect(denied.length).toBe(2);
      expect(denied[0].type).toBe('security');
      expect(denied[0].outcome).toBe('8');

      // Admin can query, with filters
      const response = await request(app)
        .get('/api/admin/audit-logs')
        .query({ type: 'auth', page: 1, limit: 10 })
        .set('Authorization', `Bearer ${admin.generateAuthToken()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.events.length).toBeGreaterThan(0);
      response.body.events.forEach((event) => expect(event.type).toBe('auth'));
      expect(response.body.pagination).toHaveProperty('total');

      // Querying the audit log is itself audited
      await flushAudit();
      const queryEvent = await AuditEvent.findOne({ subtype: 'audit-query' }).lean();
      expect(queryEvent).toBeTruthy();
      expect(String(queryEvent.agent.userId)).toBe(String(admin._id));
      expect(queryEvent.context.after.filters.type).toBe('auth');
    });

    it('filters by patientId', async () => {
      const admin = await createUser({ role: 'admin' });
      const patient = await createUser();
      const otherPatient = await createUser();

      await Vitals.create({ patient: patient._id, heartRate: { value: 70 } });
      await Vitals.create({ patient: otherPatient._id, heartRate: { value: 71 } });
      await flushAudit();

      const response = await request(app)
        .get('/api/admin/audit-logs')
        .query({ patientId: String(patient._id) })
        .set('Authorization', `Bearer ${admin.generateAuthToken()}`)
        .expect(200);

      expect(response.body.events.length).toBeGreaterThan(0);
      response.body.events.forEach((event) => {
        const pid = event.entity.patientId._id || event.entity.patientId;
        expect(String(pid)).toBe(String(patient._id));
      });
    });
  });

  describe('hash chain tamper evidence', () => {
    const loadChain = () => AuditEvent.find().sort({ seq: 1 }).lean();

    it('verifies an intact chain', async () => {
      const patient = await createUser();
      const vitals = await Vitals.create({ patient: patient._id, heartRate: { value: 72 } });
      vitals.set('heartRate.value', 75);
      await vitals.save();
      await flushAudit();

      const docs = await loadChain();
      expect(docs.length).toBeGreaterThanOrEqual(2); // vitals create + update
      const result = await verifyChain(docs);
      expect(result.valid).toBe(true);
      expect(result.checked).toBe(docs.length);
    });

    it('detects a retroactive edit made with direct database access', async () => {
      const patient = await createUser();
      await Vitals.create({ patient: patient._id, heartRate: { value: 72 } });
      await Vitals.create({ patient: patient._id, heartRate: { value: 73 } });
      await flushAudit();

      const docs = await loadChain();
      const target = docs[0];
      // Raw driver update bypasses Mongoose hooks — exactly the attack
      // the chain is meant to surface
      await mongoose.connection
        .collection('auditevents')
        .updateOne({ _id: target._id }, { $set: { subtype: 'record-delete' } });

      const result = await verifyChain(await loadChain());
      expect(result.valid).toBe(false);
      expect(result.error.seq).toBe(target.seq);
      expect(result.error.reason).toMatch(/altered/);
    });

    it('detects a deleted record as a sequence gap', async () => {
      const patient = await createUser();
      await Vitals.create({ patient: patient._id, heartRate: { value: 72 } });
      await Vitals.create({ patient: patient._id, heartRate: { value: 73 } });
      await Vitals.create({ patient: patient._id, heartRate: { value: 74 } });
      await flushAudit();

      const docs = await loadChain();
      expect(docs.length).toBeGreaterThanOrEqual(3);
      const middle = docs[1];
      await mongoose.connection.collection('auditevents').deleteOne({ _id: middle._id });

      const result = await verifyChain(await loadChain());
      expect(result.valid).toBe(false);
      expect(result.error.reason).toMatch(/gap/);
    });
  });

  describe('failed authorization capture', () => {
    it('logs exactly one event for an unauthenticated request to a protected route', async () => {
      await request(app).get('/api/admin/users').expect(401);
      await flushAudit();

      const events = await AuditEvent.find({}).lean();
      const denied = events.filter((e) => e.subtype === 'access-denied');
      expect(denied).toHaveLength(1);
      expect(denied[0].outcomeDesc).toBe('unauthenticated');
      expect(denied[0].agent.role).toBe('anonymous');
      expect(denied[0].context.path).toBe('/api/admin/users');
      // No duplicate audit rows for the same response
      expect(events).toHaveLength(1);
    });
  });

  describe('resilience', () => {
    it('never fails the request when the audit write fails, and falls back to the error log', async () => {
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
      const createSpy = jest
        .spyOn(AuditEvent, 'create')
        .mockRejectedValue(new Error('datastore unavailable'));

      const user = await createUser();
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: 'Password@123' })
        .expect(200);
      expect(response.body).toHaveProperty('tokens');

      await flushAudit();

      const fallbackCall = errorSpy.mock.calls.find(
        (call) => call[0] === 'AUDIT_WRITE_FAILED'
      );
      expect(fallbackCall).toBeTruthy();
      expect(fallbackCall[1].event.subtype).toBe('login-success');

      createSpy.mockRestore();
      errorSpy.mockRestore();
    }, 20000);
  });
});
