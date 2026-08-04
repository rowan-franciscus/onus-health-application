const mongoose = require('mongoose');
const auditPlugin = require('./plugins/audit.plugin');
const { formatDate } = require('../utils/dateUtils');
const Schema = mongoose.Schema;

const ConsultationSchema = new Schema({
  // Core consultation metadata
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  // General consultation information
  general: {
    specialistName: {
      type: String,
      required: true
    },
    specialty: {
      type: String,
      required: true
    },
    practice: {
      type: String
    },
    reasonForVisit: {
      type: String,
      required: function() {
        // Only require reasonForVisit for completed consultations
        return this.status === 'completed';
      }
    },
    notes: {
      type: String
    },
    diagnosis: {
      type: String
    }
  },

  // Narrative sections (free-form text)
  history: {
    type: String
  },
  physicalExamination: {
    type: String
  },
  management: {
    type: String
  },
  
  // References to associated medical records
  // Each of these will be populated from their respective collections when needed
  vitals: {
    type: Schema.Types.ObjectId,
    ref: 'Vitals'
  },
  medications: [{
    type: Schema.Types.ObjectId,
    ref: 'Medication'
  }],
  immunizations: [{
    type: Schema.Types.ObjectId,
    ref: 'Immunization'
  }],
  labResults: [{
    type: Schema.Types.ObjectId,
    ref: 'LabResult'
  }],
  radiologyReports: [{
    type: Schema.Types.ObjectId,
    ref: 'RadiologyReport'
  }],
  hospitalRecords: [{
    type: Schema.Types.ObjectId,
    ref: 'HospitalRecord'
  }],
  surgeryRecords: [{
    type: Schema.Types.ObjectId,
    ref: 'SurgeryRecord'
  }],
  
  // Thread support: follow-ups point to their root consultation
  parentConsultation: {
    type: Schema.Types.ObjectId,
    ref: 'Consultation',
    default: null,
    index: true
  },

  // Case lifecycle status (meaningful only on root consultations)
  caseStatus: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  caseClosedAt: {
    type: Date,
    default: null
  },

  // Consultation status and metadata
  status: {
    type: String,
    enum: ['draft', 'completed', 'archived'],
    default: 'draft'
  },
  isSharedWithPatient: {
    type: Boolean,
    default: true
  },
  // Billing status for operational/insurance support (Practice Admin role).
  // Pure metadata — never affects clinical fields.
  billingStatus: {
    type: String,
    enum: ['pending', 'processed', 'submitted'],
    default: 'pending'
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Virtual for consultation name/title (useful for display purposes)
ConsultationSchema.virtual('title').get(function() {
  return `${this.general.specialty} - ${formatDate(this.date)}`;
});

// Index for faster queries
ConsultationSchema.index({ patient: 1, date: -1 });
ConsultationSchema.index({ provider: 1, date: -1 });

ConsultationSchema.methods.isRoot = function() {
  return this.parentConsultation == null;
};

ConsultationSchema.methods.closeCase = function() {
  if (!this.isRoot()) throw new Error('Only the root consultation can be closed');
  if (this.caseStatus === 'closed') throw new Error('Case is already closed');
  this.caseStatus = 'closed';
  this.caseClosedAt = new Date();
};

ConsultationSchema.methods.reopenCase = function() {
  if (!this.isRoot()) throw new Error('Only the root consultation can be reopened');
  if (this.caseStatus === 'open') throw new Error('Case is already open');
  this.caseStatus = 'open';
  this.caseClosedAt = null;
};

ConsultationSchema.plugin(auditPlugin, { resourceType: 'Consultation' });

module.exports = mongoose.model('Consultation', ConsultationSchema); 