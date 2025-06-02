const mongoose = require('mongoose');
const { MedicalRecord } = require('./MedicalRecord');
const Schema = mongoose.Schema;

// Radiology Report schema - extends the base MedicalRecord
const RadiologyReportSchema = new Schema({
  typeOfScan: {
    type: String,
    required: true,
    enum: ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'PET Scan', 'Mammography', 'Fluoroscopy', 'Angiography', 'Other']
  },
  date: {
    type: Date,
    required: true
  },
  bodyPartExamined: {
    type: String,
    required: true
  },
  findings: {
    type: String,
    required: true
  },
  recommendations: {
    type: String
  },
  radiologist: {
    type: String
  },
  contrastUsed: {
    type: Boolean,
    default: false
  },
  contrastDetails: {
    type: String
  },
  facilityName: {
    type: String
  },
  comparison: {
    type: String
  },
  technique: {
    type: String
  },
  impression: {
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

// Create RadiologyReport as a discriminator of MedicalRecord
const RadiologyReport = MedicalRecord.discriminator('RadiologyReport', RadiologyReportSchema);

module.exports = RadiologyReport; 