/**
 * AuditEvent model
 * Persistent audit trail aligned with HIPAA §164.312(b) audit control
 * requirements. Field structure follows the HL7/FHIR AuditEvent resource
 * where practical (agent / entity / action C|R|U|D|E / coded outcome).
 *
 * Append-only: every update/delete operation is rejected at the schema level.
 * All writes must go through services/audit.service.js — never insert from
 * route handlers directly. MongoDB Atlas role restrictions for this
 * collection are documented in server/docs/AUDIT_TRAIL.md.
 *
 * Must never contain clinical content (record values, findings, results),
 * passwords, tokens, or session secrets — only that a resource was acted on.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AuditEventSchema = new Schema({
  // Monotonic chain position; unique so concurrent writers conflict loudly
  seq: {
    type: Number,
    required: true
  },
  // UTC timestamp, server-generated (never client-supplied)
  recorded: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    required: true,
    enum: ['auth', 'data', 'consent', 'admin', 'export', 'security', 'audit']
  },
  subtype: {
    type: String,
    required: true
  },
  // FHIR AuditEvent.action: Create / Read / Update / Delete / Execute
  action: {
    type: String,
    required: true,
    enum: ['C', 'R', 'U', 'D', 'E']
  },
  // FHIR AuditEvent.outcome: 0 success, 4 minor failure, 8 serious failure
  outcome: {
    type: String,
    required: true,
    enum: ['0', '4', '8'],
    default: '0'
  },
  // Failure reason code (e.g. 'invalid-password'); never credentials or PHI
  outcomeDesc: {
    type: String
  },
  // Who performed the action
  agent: {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    role: {
      type: String,
      enum: ['patient', 'provider', 'admin', 'practice_admin', 'system', 'anonymous'],
      default: 'anonymous'
    },
    ip: { type: String },
    userAgent: { type: String }
  },
  // What was acted on, and whose data it is
  entity: {
    resourceType: { type: String },
    resourceId: { type: Schema.Types.ObjectId },
    patientId: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  // Authorization context at the time of access
  context: {
    connectionId: { type: Schema.Types.ObjectId, ref: 'Connection' },
    accessLevel: { type: String },
    practiceId: { type: Schema.Types.ObjectId, ref: 'Practice' },
    method: { type: String },
    path: { type: String },
    // Names of modified fields only — never field values
    modifiedFields: [{ type: String }],
    // State transitions (consent enum states only)
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed }
  },
  // Hash chain: hash = SHA-256(canonical(event incl. prevHash))
  prevHash: {
    type: String,
    required: true
  },
  hash: {
    type: String,
    required: true
  }
}, {
  strict: true,
  versionKey: false,
  timestamps: false
});

AuditEventSchema.index({ seq: 1 }, { unique: true });
AuditEventSchema.index({ hash: 1 }, { unique: true });
AuditEventSchema.index({ 'entity.patientId': 1, recorded: -1 });
AuditEventSchema.index({ 'agent.userId': 1, recorded: -1 });

// ---- Append-only enforcement (application layer) ----

const APPEND_ONLY_ERROR = 'AuditEvent is append-only: update and delete operations are not permitted';

AuditEventSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error(APPEND_ONLY_ERROR));
  }
  next();
});

// Block document-level deleteOne/updateOne and every query-level mutation
['deleteOne', 'updateOne'].forEach((op) => {
  AuditEventSchema.pre(op, { document: true, query: true }, function (next) {
    next(new Error(APPEND_ONLY_ERROR));
  });
});

[
  'updateMany',
  'replaceOne',
  'findOneAndUpdate',
  'findOneAndReplace',
  'findOneAndDelete',
  'deleteMany'
].forEach((op) => {
  AuditEventSchema.pre(op, function (next) {
    next(new Error(APPEND_ONLY_ERROR));
  });
});

module.exports = mongoose.model('AuditEvent', AuditEventSchema);
