const mongoose = require('mongoose');
const { MedicalRecord } = require('./MedicalRecord');
const Schema = mongoose.Schema;

// Lab Result schema - extends the base MedicalRecord
const LabResultSchema = new Schema({
  testName: {
    type: String,
    required: true
  },
  labName: {
    type: String,
    required: true
  },
  dateOfTest: {
    type: Date,
    required: true
  },
  results: {
    type: String,
    required: true
  },
  referenceRange: {
    type: String
  },
  unit: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'abnormal', 'normal'],
    default: 'pending'
  },
  orderedBy: {
    type: String
  },
  comments: {
    type: String
  },
  diagnosis: {
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

// Create LabResult as a discriminator of MedicalRecord
const LabResultRecord = MedicalRecord.discriminator('LabResult', LabResultSchema);

module.exports = LabResultRecord; 