const mongoose = require('mongoose');
const { MedicalRecord } = require('./MedicalRecord');
const Schema = mongoose.Schema;

// Surgery Record schema - extends the base MedicalRecord
const SurgeryRecordSchema = new Schema({
  typeOfSurgery: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  surgeon: {
    name: String,
    specialty: String
  },
  assistingSurgeons: [{
    name: String,
    specialty: String
  }],
  anesthesiaType: {
    type: String,
    enum: ['General', 'Local', 'Regional', 'Spinal', 'Epidural', 'None', 'Other']
  },
  anesthesiologist: {
    name: String
  },
  duration: {
    hours: Number,
    minutes: Number
  },
  complications: {
    type: String
  },
  recoveryNotes: {
    type: String
  },
  hospitalName: {
    type: String
  },
  preOpDiagnosis: {
    type: String
  },
  postOpDiagnosis: {
    type: String
  },
  procedureDetails: {
    type: String
  },
  implants: [{
    type: String
  }],
  pathologyFindings: {
    type: String
  },
  followUpInstructions: {
    type: String
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

// Create SurgeryRecord as a discriminator of MedicalRecord
const SurgeryRecord = MedicalRecord.discriminator('SurgeryRecord', SurgeryRecordSchema);

module.exports = SurgeryRecord; 