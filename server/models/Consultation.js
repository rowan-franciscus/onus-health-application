const mongoose = require('mongoose');
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
      required: true
    },
    notes: {
      type: String
    }
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
  return `${this.general.specialty} - ${new Date(this.date).toLocaleDateString()}`;
});

// Index for faster queries
ConsultationSchema.index({ patient: 1, date: -1 });
ConsultationSchema.index({ provider: 1, date: -1 });

module.exports = mongoose.model('Consultation', ConsultationSchema); 