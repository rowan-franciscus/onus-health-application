const mongoose = require('mongoose');
const { MedicalRecord } = require('./MedicalRecord');
const Schema = mongoose.Schema;

// Medication schema - extends the base MedicalRecord
const MedicationSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  dosage: {
    value: {
      type: String,
      required: true
    },
    unit: {
      type: String,
      required: true
    }
  },
  frequency: {
    type: String,
    required: true
  },
  reasonForPrescription: {
    type: String
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  instructions: {
    type: String
  },
  sideEffects: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Create Medication as a discriminator of MedicalRecord
const MedicationRecord = MedicalRecord.discriminator('Medication', MedicationSchema);

module.exports = MedicationRecord; 