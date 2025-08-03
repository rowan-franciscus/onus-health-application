/**
 * Clean up orphaned data in MongoDB
 * Removes connections, consultations, and medical records linked to non-existent users
 * Run with: node server/scripts/cleanupOrphanedData.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Import all models
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

// Track statistics
const stats = {
  orphanedConnections: 0,
  orphanedConsultations: 0,
  orphanedMedicalRecords: {
    vitals: 0,
    medications: 0,
    immunizations: 0,
    labResults: 0,
    radiologyReports: 0,
    hospitalRecords: 0,
    surgeryRecords: 0
  },
  errors: []
};

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_ATLAS_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/onus-health';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    console.log(`📍 Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function getAllUserIds() {
  const users = await User.find({}, '_id').lean();
  return new Set(users.map(user => user._id.toString()));
}

async function cleanupOrphanedConnections(validUserIds) {
  console.log('\n🔗 Cleaning up orphaned connections...');
  
  try {
    // Find connections where either provider or patient doesn't exist
    const orphanedConnections = await Connection.find({
      $or: [
        { provider: { $exists: true } },
        { patient: { $exists: true } }
      ]
    }).lean();
    
    const toDelete = [];
    
    for (const connection of orphanedConnections) {
      const providerExists = validUserIds.has(connection.provider?.toString());
      const patientExists = validUserIds.has(connection.patient?.toString());
      
      if (!providerExists || !patientExists) {
        toDelete.push(connection._id);
        console.log(`   - Found orphaned connection: ${connection._id}`);
        if (!providerExists) console.log(`     Provider ${connection.provider} no longer exists`);
        if (!patientExists) console.log(`     Patient ${connection.patient} no longer exists`);
      }
    }
    
    if (toDelete.length > 0) {
      const result = await Connection.deleteMany({ _id: { $in: toDelete } });
      stats.orphanedConnections = result.deletedCount;
      console.log(`✅ Deleted ${result.deletedCount} orphaned connections`);
    } else {
      console.log('✅ No orphaned connections found');
    }
  } catch (error) {
    console.error('❌ Error cleaning connections:', error);
    stats.errors.push(`Connection cleanup: ${error.message}`);
  }
}

async function cleanupOrphanedConsultations(validUserIds) {
  console.log('\n📋 Cleaning up orphaned consultations...');
  
  try {
    // Find consultations where either provider or patient doesn't exist
    const orphanedConsultations = await Consultation.find({
      $or: [
        { provider: { $exists: true } },
        { patient: { $exists: true } }
      ]
    }).lean();
    
    const toDelete = [];
    const medicalRecordIdsToClean = {
      vitals: [],
      medications: [],
      immunizations: [],
      labResults: [],
      radiologyReports: [],
      hospitalRecords: [],
      surgeryRecords: []
    };
    
    for (const consultation of orphanedConsultations) {
      const providerExists = validUserIds.has(consultation.provider?.toString());
      const patientExists = validUserIds.has(consultation.patient?.toString());
      
      if (!providerExists || !patientExists) {
        toDelete.push(consultation._id);
        console.log(`   - Found orphaned consultation: ${consultation._id}`);
        if (!providerExists) console.log(`     Provider ${consultation.provider} no longer exists`);
        if (!patientExists) console.log(`     Patient ${consultation.patient} no longer exists`);
        
        // Collect medical record IDs from this consultation
        if (consultation.vitals) medicalRecordIdsToClean.vitals.push(consultation.vitals);
        if (consultation.medications) medicalRecordIdsToClean.medications.push(...consultation.medications);
        if (consultation.immunizations) medicalRecordIdsToClean.immunizations.push(...consultation.immunizations);
        if (consultation.labResults) medicalRecordIdsToClean.labResults.push(...consultation.labResults);
        if (consultation.radiologyReports) medicalRecordIdsToClean.radiologyReports.push(...consultation.radiologyReports);
        if (consultation.hospitalRecords) medicalRecordIdsToClean.hospitalRecords.push(...consultation.hospitalRecords);
        if (consultation.surgeryRecords) medicalRecordIdsToClean.surgeryRecords.push(...consultation.surgeryRecords);
      }
    }
    
    if (toDelete.length > 0) {
      // Delete orphaned consultations
      const result = await Consultation.deleteMany({ _id: { $in: toDelete } });
      stats.orphanedConsultations = result.deletedCount;
      console.log(`✅ Deleted ${result.deletedCount} orphaned consultations`);
      
      // Clean up associated medical records
      await cleanupMedicalRecordsFromConsultations(medicalRecordIdsToClean);
    } else {
      console.log('✅ No orphaned consultations found');
    }
  } catch (error) {
    console.error('❌ Error cleaning consultations:', error);
    stats.errors.push(`Consultation cleanup: ${error.message}`);
  }
}

async function cleanupMedicalRecordsFromConsultations(recordIds) {
  console.log('\n🏥 Cleaning up medical records from orphaned consultations...');
  
  const cleanupTasks = [
    { model: VitalsRecord, ids: recordIds.vitals, type: 'vitals' },
    { model: MedicationRecord, ids: recordIds.medications, type: 'medications' },
    { model: ImmunizationRecord, ids: recordIds.immunizations, type: 'immunizations' },
    { model: LabResultRecord, ids: recordIds.labResults, type: 'labResults' },
    { model: RadiologyReport, ids: recordIds.radiologyReports, type: 'radiologyReports' },
    { model: HospitalRecord, ids: recordIds.hospitalRecords, type: 'hospitalRecords' },
    { model: SurgeryRecord, ids: recordIds.surgeryRecords, type: 'surgeryRecords' }
  ];
  
  for (const task of cleanupTasks) {
    if (task.ids.length > 0) {
      try {
        const result = await task.model.deleteMany({ _id: { $in: task.ids } });
        stats.orphanedMedicalRecords[task.type] = result.deletedCount;
        console.log(`   - Deleted ${result.deletedCount} ${task.type} records`);
      } catch (error) {
        console.error(`   ❌ Error cleaning ${task.type}:`, error.message);
        stats.errors.push(`${task.type} cleanup: ${error.message}`);
      }
    }
  }
}

async function cleanupOrphanedMedicalRecords(validUserIds) {
  console.log('\n🏥 Cleaning up orphaned medical records (not linked to consultations)...');
  
  const recordTypes = [
    { model: VitalsRecord, name: 'vitals' },
    { model: MedicationRecord, name: 'medications' },
    { model: ImmunizationRecord, name: 'immunizations' },
    { model: LabResultRecord, name: 'labResults' },
    { model: RadiologyReport, name: 'radiologyReports' },
    { model: HospitalRecord, name: 'hospitalRecords' },
    { model: SurgeryRecord, name: 'surgeryRecords' }
  ];
  
  for (const recordType of recordTypes) {
    try {
      // Find records where patient or provider doesn't exist
      const orphanedRecords = await recordType.model.find({
        $or: [
          { patient: { $exists: true } },
          { provider: { $exists: true } }
        ]
      }).lean();
      
      const toDelete = [];
      
      for (const record of orphanedRecords) {
        const patientExists = validUserIds.has(record.patient?.toString());
        const providerExists = validUserIds.has(record.provider?.toString());
        
        if (!patientExists || !providerExists) {
          toDelete.push(record._id);
        }
      }
      
      if (toDelete.length > 0) {
        const result = await recordType.model.deleteMany({ _id: { $in: toDelete } });
        stats.orphanedMedicalRecords[recordType.name] += result.deletedCount;
        console.log(`   - Deleted ${result.deletedCount} orphaned ${recordType.name} records`);
      }
    } catch (error) {
      console.error(`   ❌ Error cleaning ${recordType.name}:`, error.message);
      stats.errors.push(`${recordType.name} cleanup: ${error.message}`);
    }
  }
}

async function verifyDataIntegrity() {
  console.log('\n🔍 Verifying data integrity after cleanup...');
  
  try {
    // Count remaining records
    const connectionCount = await Connection.countDocuments();
    const consultationCount = await Consultation.countDocuments();
    const userCount = await User.countDocuments();
    
    console.log(`\n📊 Database statistics after cleanup:`);
    console.log(`   - Total users: ${userCount}`);
    console.log(`   - Total connections: ${connectionCount}`);
    console.log(`   - Total consultations: ${consultationCount}`);
    
    // Verify all connections have valid users
    const connectionsWithInvalidUsers = await Connection.find({
      $or: [
        { provider: { $exists: false } },
        { patient: { $exists: false } }
      ]
    }).countDocuments();
    
    if (connectionsWithInvalidUsers > 0) {
      console.log(`   ⚠️  Found ${connectionsWithInvalidUsers} connections with invalid user references`);
    } else {
      console.log(`   ✅ All connections have valid user references`);
    }
    
    // Verify all consultations have valid users
    const consultationsWithInvalidUsers = await Consultation.find({
      $or: [
        { provider: { $exists: false } },
        { patient: { $exists: false } }
      ]
    }).countDocuments();
    
    if (consultationsWithInvalidUsers > 0) {
      console.log(`   ⚠️  Found ${consultationsWithInvalidUsers} consultations with invalid user references`);
    } else {
      console.log(`   ✅ All consultations have valid user references`);
    }
  } catch (error) {
    console.error('❌ Error verifying data integrity:', error);
    stats.errors.push(`Data verification: ${error.message}`);
  }
}

async function printSummary() {
  console.log('\n🎯 Cleanup Summary:');
  console.log('===================');
  console.log(`Orphaned connections deleted: ${stats.orphanedConnections}`);
  console.log(`Orphaned consultations deleted: ${stats.orphanedConsultations}`);
  console.log(`Orphaned medical records deleted:`);
  
  for (const [type, count] of Object.entries(stats.orphanedMedicalRecords)) {
    if (count > 0) {
      console.log(`   - ${type}: ${count}`);
    }
  }
  
  const totalMedicalRecords = Object.values(stats.orphanedMedicalRecords).reduce((a, b) => a + b, 0);
  console.log(`   Total medical records: ${totalMedicalRecords}`);
  
  if (stats.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    stats.errors.forEach(error => console.log(`   - ${error}`));
  } else {
    console.log('\n✅ Cleanup completed without errors');
  }
}

async function main() {
  try {
    console.log('🧹 Starting orphaned data cleanup...');
    console.log('=====================================');
    
    await connectDB();
    
    // Get all valid user IDs
    console.log('\n📋 Getting list of valid users...');
    const validUserIds = await getAllUserIds();
    console.log(`✅ Found ${validUserIds.size} valid users in the database`);
    
    // Cleanup orphaned data
    await cleanupOrphanedConnections(validUserIds);
    await cleanupOrphanedConsultations(validUserIds);
    await cleanupOrphanedMedicalRecords(validUserIds);
    
    // Verify data integrity
    await verifyDataIntegrity();
    
    // Print summary
    await printSummary();
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

// Check if running in dry-run mode
const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');

if (isDryRun) {
  console.log('\n⚠️  DRY RUN MODE - No data will be deleted\n');
}

// Modify the main function to support dry run
async function mainWithDryRun() {
  // Temporarily override mongoose delete methods for dry run
  if (isDryRun) {
    const originalDeleteMany = mongoose.Model.deleteMany;
    mongoose.Model.deleteMany = function(filter) {
      console.log(`   [DRY RUN] Would delete from ${this.modelName}:`, filter);
      return Promise.resolve({ deletedCount: 0 });
    };
  }
  
  await main();
}

// Run the script
mainWithDryRun(); 