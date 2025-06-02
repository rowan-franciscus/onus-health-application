const mongoose = require('mongoose');
require('dotenv').config();
const config = require('../config/environment');
const User = require('../models/User');
const Connection = require('../models/Connection');
const Consultation = require('../models/Consultation');
const VitalsRecord = require('../models/VitalsRecord');
const MedicationRecord = require('../models/MedicationRecord');
const ImmunizationRecord = require('../models/ImmunizationRecord');
const LabResultRecord = require('../models/LabResultRecord');
const RadiologyReport = require('../models/RadiologyReport');
const HospitalRecord = require('../models/HospitalRecord');
const SurgeryRecord = require('../models/SurgeryRecord');

const providerEmail = 'rowan.franciscus.3@gmail.com';
const patientEmail = 'rowan.franciscus.4@gmail.com';

(async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    // Find the provider and patient
    const provider = await User.findOne({ email: providerEmail });
    const patient = await User.findOne({ email: patientEmail });

    if (!provider) {
      console.log(`Provider not found: ${providerEmail}`);
      process.exit(1);
    }

    if (!patient) {
      console.log(`Patient not found: ${patientEmail}`);
      process.exit(1);
    }

    console.log(`Provider found: ${provider.email} (${provider._id})`);
    console.log(`Patient found: ${patient.email} (${patient._id})`);

    // Find all consultations between the provider and patient
    const consultations = await Consultation.find({
      provider: provider._id,
      patient: patient._id
    });

    console.log(`\nFound ${consultations.length} consultations to delete`);

    // Delete all associated medical records for each consultation
    for (const consultation of consultations) {
      console.log(`\nDeleting records for consultation: ${consultation._id}`);

      // Delete vitals
      if (consultation.vitals) {
        await VitalsRecord.findByIdAndDelete(consultation.vitals);
        console.log('  - Deleted vitals record');
      }

      // Delete medications
      if (consultation.medications && consultation.medications.length > 0) {
        await MedicationRecord.deleteMany({ _id: { $in: consultation.medications } });
        console.log(`  - Deleted ${consultation.medications.length} medication records`);
      }

      // Delete immunizations
      if (consultation.immunizations && consultation.immunizations.length > 0) {
        await ImmunizationRecord.deleteMany({ _id: { $in: consultation.immunizations } });
        console.log(`  - Deleted ${consultation.immunizations.length} immunization records`);
      }

      // Delete lab results
      if (consultation.labResults && consultation.labResults.length > 0) {
        await LabResultRecord.deleteMany({ _id: { $in: consultation.labResults } });
        console.log(`  - Deleted ${consultation.labResults.length} lab result records`);
      }

      // Delete radiology reports
      if (consultation.radiologyReports && consultation.radiologyReports.length > 0) {
        await RadiologyReport.deleteMany({ _id: { $in: consultation.radiologyReports } });
        console.log(`  - Deleted ${consultation.radiologyReports.length} radiology reports`);
      }

      // Delete hospital records
      if (consultation.hospitalRecords && consultation.hospitalRecords.length > 0) {
        await HospitalRecord.deleteMany({ _id: { $in: consultation.hospitalRecords } });
        console.log(`  - Deleted ${consultation.hospitalRecords.length} hospital records`);
      }

      // Delete surgery records
      if (consultation.surgeryRecords && consultation.surgeryRecords.length > 0) {
        await SurgeryRecord.deleteMany({ _id: { $in: consultation.surgeryRecords } });
        console.log(`  - Deleted ${consultation.surgeryRecords.length} surgery records`);
      }
    }

    // Delete all consultations
    const deletedConsultations = await Consultation.deleteMany({
      provider: provider._id,
      patient: patient._id
    });
    console.log(`\nDeleted ${deletedConsultations.deletedCount} consultations`);

    // Remove the connection between provider and patient
    const connection = await Connection.findOne({
      provider: provider._id,
      patient: patient._id
    });

    if (connection) {
      await Connection.deleteOne({ _id: connection._id });
      console.log(`\nDeleted connection: ${connection._id}`);
    } else {
      console.log('\nNo connection found between provider and patient');
    }

    // Verify the provider has no more patients
    const providerConnections = await Connection.find({ provider: provider._id });
    const providerConsultations = await Consultation.find({ provider: provider._id });
    
    console.log(`\nProvider ${providerEmail} now has:`);
    console.log(`  - ${providerConnections.length} patient connections`);
    console.log(`  - ${providerConsultations.length} consultations`);

    // Verify the patient has no more providers
    const patientConnections = await Connection.find({ patient: patient._id });
    const patientConsultations = await Consultation.find({ patient: patient._id });
    
    console.log(`\nPatient ${patientEmail} now has:`);
    console.log(`  - ${patientConnections.length} provider connections`);
    console.log(`  - ${patientConsultations.length} consultations`);

    console.log('\n✓ Data deletion completed successfully');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
})(); 