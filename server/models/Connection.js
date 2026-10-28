const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const auditPlugin = require('./plugins/audit.plugin');

const ConnectionSchema = new Schema({
  // The patient user
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // The provider user
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Access level: limited (default) or full
  accessLevel: {
    type: String,
    enum: ['limited', 'full'],
    default: 'limited'
  },
  // Status for full access requests
  fullAccessStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'denied'],
    default: 'none'
  },
  // Who initiated the connection
  initiatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // When the connection was initiated
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  // When the full access status was last updated
  fullAccessStatusUpdatedAt: {
    type: Date
  },
  // Any notes associated with this connection
  notes: {
    type: String
  },
  // Whether patient has been notified about the connection
  patientNotified: {
    type: Boolean,
    default: false
  },
  // When the patient was notified
  patientNotifiedAt: {
    type: Date
  },
  // Expiration date of the connection (optional)
  expiresAt: {
    type: Date
  },
  // When the connection was last accessed by the provider
  lastAccessedAt: {
    type: Date
  },
  // How the link was created: provider "Add New Patient" (needs patient
  // consent) or an access request to an existing patient account
  onboardingSource: {
    type: String,
    enum: ['provider_initiated', 'patient_initiated'],
    required: true
  },
  // Snapshot of the details the provider entered on Add New Patient. Until
  // consent is ACTIVE this, not the live patient profile, is what they see.
  registration: {
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String },
    phone: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String },
    insurance: {
      provider: { type: String },
      plan: { type: String }
    }
  },
  // Patient consent for this provider. No default on status: every creation
  // site must set it explicitly, so a missed site fails instead of granting access.
  // All transitions go through services/consent.service.js.
  consent: {
    status: {
      type: String,
      enum: ['PENDING_CONSENT', 'ACTIVE', 'DECLINED', 'EXPIRED', 'WITHDRAWN'],
      required: true
    },
    // SHA-256 of the emailed consent token; the raw token is never stored
    tokenHash: { type: String },
    tokenExpires: { type: Date },
    dobAttempts: { type: Number, default: 0 },
    // Consent text version shown when the patient responded
    textVersion: { type: String },
    inviteSentAt: { type: Date },
    firstInviteSentAt: { type: Date },
    resendCount: { type: Number, default: 0 },
    respondedAt: { type: Date },
    withdrawnAt: { type: Date },
    // First time the link lapsed (kept across resends, for the expiry rate)
    expiredAt: { type: Date },
    // How consent was obtained. Missing means 'email' (the link, or the
    // patient's account): only the uploaded-form path sets it.
    method: { type: String, enum: ['email', 'uploaded_form'] },
    // The signed paper form behind an 'uploaded_form' consent
    form: {
      record: { type: Schema.Types.ObjectId, ref: 'PhysicalRecord' },
      uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      uploadedAt: { type: Date }
    },
    // "Patient couldn't consent now" records (instrumentation)
    deferrals: [{
      _id: false,
      reason: {
        type: String,
        enum: ['no_phone', 'no_email_access', 'no_email_address', 'declined_verbally', 'other'],
        required: true
      },
      note: { type: String, trim: true, maxlength: 500 },
      recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      at: { type: Date, default: Date.now }
    }]
  }
}, {
  timestamps: true
});

// Compound index to ensure uniqueness of patient-provider pairs
ConnectionSchema.index({ patient: 1, provider: 1 }, { unique: true });

// Indexes for faster queries
ConnectionSchema.index({ patient: 1, accessLevel: 1 });
ConnectionSchema.index({ provider: 1, accessLevel: 1 });
ConnectionSchema.index({ patient: 1, fullAccessStatus: 1 });
ConnectionSchema.index({ provider: 1, fullAccessStatus: 1 });
ConnectionSchema.index({ 'consent.tokenHash': 1 }, { sparse: true });
ConnectionSchema.index({ onboardingSource: 1, 'consent.status': 1 });

// Method to request full access
ConnectionSchema.methods.requestFullAccess = function() {
  this.fullAccessStatus = 'pending';
  this.fullAccessStatusUpdatedAt = Date.now();
  return this.save();
};

// Method to approve full access
ConnectionSchema.methods.approveFullAccess = function() {
  this.accessLevel = 'full';
  this.fullAccessStatus = 'approved';
  this.fullAccessStatusUpdatedAt = Date.now();
  return this.save();
};

// Method to deny full access
ConnectionSchema.methods.denyFullAccess = function() {
  this.accessLevel = 'limited';
  this.fullAccessStatus = 'denied';
  this.fullAccessStatusUpdatedAt = Date.now();
  return this.save();
};

// Method to revoke access (patient removes provider)
ConnectionSchema.methods.revokeAccess = function() {
  this.accessLevel = 'limited';
  this.fullAccessStatus = 'none';
  this.fullAccessStatusUpdatedAt = Date.now();
  return this.save();
};

// Audit the consent lifecycle (create/request/approve/deny/revoke/delete)
ConnectionSchema.plugin(auditPlugin, { resourceType: 'Connection' });

module.exports = mongoose.model('Connection', ConnectionSchema);