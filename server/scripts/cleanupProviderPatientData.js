require('dotenv').config();
const mongoose = require('mongoose');
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

async function cleanupProviderPatientData() {
  try {
    // Connect to MongoDB
    const config = require('../config/environment');
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');
    
    const providerEmail = 'rowan.franciscus5@gmail.com';
    const patientEmail = 'rowan.franciscus.6@gmail.com';
    
    // Find the provider and patient
    const provider = await User.findOne({ email: providerEmail, role: 'provider' });
    const patient = await User.findOne({ email: patientEmail, role: 'patient' });
    
    if (!provider) {
      console.log(`Provider not found: ${providerEmail}`);
      return;
    }
    
    if (!patient) {
      console.log(`Patient not found: ${patientEmail}`);
      return;
    }
    
    console.log('\n=== Found Users ===');
    console.log(`Provider: ${provider.firstName} ${provider.lastName} (${provider._id})`);
    console.log(`Patient: ${patient.firstName} ${patient.lastName} (${patient._id})`);
    
    // Check for connections
    console.log('\n=== Checking Connections ===');
    const connections = await Connection.find({
      provider: provider._id,
      patient: patient._id
    });
    
    if (connections.length > 0) {
      console.log(`Found ${connections.length} connection(s)`);
      connections.forEach(conn => {
        console.log(`- Connection ID: ${conn._id}, Access Level: ${conn.accessLevel}, Status: ${conn.fullAccessStatus}`);
      });
    } else {
      console.log('No connections found');
    }
    
    // Check for consultations
    console.log('\n=== Checking Consultations ===');
    const consultations = await Consultation.find({
      provider: provider._id,
      patient: patient._id
    });
    
    if (consultations.length > 0) {
      console.log(`Found ${consultations.length} consultation(s)`);
      consultations.forEach(consult => {
        console.log(`- Consultation ID: ${consult._id}, Date: ${consult.date}, Status: ${consult.status}`);
      });
    } else {
      console.log('No consultations found');
    }
    
    // Check for medical records
    console.log('\n=== Checking Medical Records ===');
    
    const recordTypes = [
      { model: VitalsRecord, name: 'Vitals' },
      { model: MedicationRecord, name: 'Medication' },
      { model: ImmunizationRecord, name: 'Immunization' },
      { model: LabResultRecord, name: 'Lab Result' },
      { model: RadiologyReport, name: 'Radiology' },
      { model: HospitalRecord, name: 'Hospital' },
      { model: SurgeryRecord, name: 'Surgery' }
    ];
    
    let totalRecords = 0;
    const recordsToDelete = {};
    
    for (const { model, name } of recordTypes) {
      const records = await model.find({
        provider: provider._id,
        patient: patient._id
      });
      
      if (records.length > 0) {
        console.log(`- ${name} Records: ${records.length}`);
        recordsToDelete[name] = records;
        totalRecords += records.length;
      }
    }
    
    if (totalRecords === 0) {
      console.log('No medical records found');
    }
    
    // Ask for confirmation before deleting
    if (connections.length > 0 || consultations.length > 0 || totalRecords > 0) {
      console.log('\n=== Summary ===');
      console.log(`Connections to delete: ${connections.length}`);
      console.log(`Consultations to delete: ${consultations.length}`);
      console.log(`Medical records to delete: ${totalRecords}`);
      
      console.log('\n=== Deleting Data ===');
      
      // Delete connections
      if (connections.length > 0) {
        await Connection.deleteMany({
          provider: provider._id,
          patient: patient._id
        });
        console.log(`✓ Deleted ${connections.length} connection(s)`);
      }
      
      // Delete consultations
      if (consultations.length > 0) {
        await Consultation.deleteMany({
          provider: provider._id,
          patient: patient._id
        });
        console.log(`✓ Deleted ${consultations.length} consultation(s)`);
      }
      
      // Delete medical records
      for (const { model, name } of recordTypes) {
        if (recordsToDelete[name] && recordsToDelete[name].length > 0) {
          await model.deleteMany({
            provider: provider._id,
            patient: patient._id
          });
          console.log(`✓ Deleted ${recordsToDelete[name].length} ${name} record(s)`);
        }
      }
      
      console.log('\n✅ Cleanup completed successfully!');
    } else {
      console.log('\n✅ No data found to clean up. The accounts have no existing connections or records.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

cleanupProviderPatientData(); 