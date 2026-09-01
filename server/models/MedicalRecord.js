const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const auditPlugin = require('./plugins/audit.plugin');

// Base schema options to be used across all medical record types
const medicalRecordOptions = {
  discriminatorKey: 'recordType',
  timestamps: true
};

// Base fields that all medical records will have
const MedicalRecordSchema = new Schema({
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false  // Made optional for patient-created records
  },
  consultation: {
    type: Schema.Types.ObjectId,
    ref: 'Consultation',
    required: false  // Made optional for patient-created records
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  notes: {
    type: String
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, medicalRecordOptions);

// Audit every create/update/delete across all record-type discriminators
MedicalRecordSchema.plugin(auditPlugin, { resourceType: 'MedicalRecord' });

// Create the base model
const MedicalRecord = mongoose.model('MedicalRecord', MedicalRecordSchema);

module.exports = {
  MedicalRecordSchema,
  MedicalRecord,
  medicalRecordOptions
}; 