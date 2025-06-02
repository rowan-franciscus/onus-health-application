// Export all models for easier imports
const User = require('./User');
const Consultation = require('./Consultation');
const MedicalRecord = require('./MedicalRecord').MedicalRecord;
const VitalsRecord = require('./VitalsRecord');
const MedicationRecord = require('./MedicationRecord');
const ImmunizationRecord = require('./ImmunizationRecord');
const LabResultRecord = require('./LabResultRecord');
const RadiologyReport = require('./RadiologyReport');
const HospitalRecord = require('./HospitalRecord');
const SurgeryRecord = require('./SurgeryRecord');
const Connection = require('./Connection');
const EmailQueue = require('./EmailQueue');

module.exports = {
  User,
  Consultation,
  MedicalRecord,
  Vitals: VitalsRecord,
  Medication: MedicationRecord,
  Immunization: ImmunizationRecord,
  LabResult: LabResultRecord,
  RadiologyReport,
  HospitalRecord,
  SurgeryRecord,
  Connection,
  EmailQueue
}; 