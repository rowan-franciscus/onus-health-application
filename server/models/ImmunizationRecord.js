const mongoose = require('mongoose');
const { MedicalRecord } = require('./MedicalRecord');
const Schema = mongoose.Schema;

// Immunization schema - extends the base MedicalRecord
const ImmunizationSchema = new Schema({
  vaccineName: {
    type: String,
    required: true
  },
  dateAdministered: {
    type: Date,
    required: true
  },
  vaccineSerialNumber: {
    type: String
  },
  nextDueDate: {
    type: Date
  },
  administeredBy: {
    type: String
  },
  manufacturer: {
    type: String
  },
  lotNumber: {
    type: String
  },
  site: {
    type: String,
    enum: ['left arm', 'right arm', 'left leg', 'right leg', 'other']
  },
  route: {
    type: String,
    enum: ['intramuscular', 'subcutaneous', 'intradermal', 'oral', 'other']
  },
  doseNumber: {
    type: Number
  },
  reactions: {
    type: String
  }
});

// Create Immunization as a discriminator of MedicalRecord
const ImmunizationRecord = MedicalRecord.discriminator('Immunization', ImmunizationSchema);

module.exports = ImmunizationRecord; 