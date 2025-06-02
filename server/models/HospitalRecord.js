const mongoose = require('mongoose');
const { MedicalRecord } = require('./MedicalRecord');
const Schema = mongoose.Schema;

// Hospital Record schema - extends the base MedicalRecord
const HospitalRecordSchema = new Schema({
  admissionDate: {
    type: Date,
    required: true
  },
  dischargeDate: {
    type: Date
  },
  hospitalName: {
    type: String,
    required: true
  },
  reasonForHospitalization: {
    type: String,
    required: true
  },
  treatmentsReceived: [{
    type: String
  }],
  attendingDoctors: [{
    name: String,
    specialty: String
  }],
  dischargeSummary: {
    type: String
  },
  investigationsDone: [{
    type: String
  }],
  diagnosis: {
    type: String
  },
  roomNumber: {
    type: String
  },
  ward: {
    type: String
  },
  admissionType: {
    type: String,
    enum: ['Emergency', 'Scheduled', 'Transfer', 'Other']
  },
  followUpInstructions: {
    type: String
  },
  isReadmission: {
    type: Boolean,
    default: false
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
  }]
});

// Create HospitalRecord as a discriminator of MedicalRecord
const HospitalRecord = MedicalRecord.discriminator('HospitalRecord', HospitalRecordSchema);

module.exports = HospitalRecord; 