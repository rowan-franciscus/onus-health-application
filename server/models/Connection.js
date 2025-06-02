const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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

module.exports = mongoose.model('Connection', ConnectionSchema); 