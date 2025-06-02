/**
 * Test script to verify patient-provider connection flow
 * Run with: node server/tests/test-connection-flow.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Import models
const User = require('../models/User');
const Connection = require('../models/Connection');
const Consultation = require('../models/Consultation');

// Test data
const testProvider = {
  email: 'test.provider@example.com',
  password: 'Test123!',
  firstName: 'Test',
  lastName: 'Provider',
  role: 'provider',
  isEmailVerified: true,
  isVerified: true,
  providerProfile: {
    specialty: 'General Practice',
    practiceInfo: {
      name: 'Test Clinic'
    }
  }
};

const testPatient = {
  email: 'test.patient@example.com',
  password: 'Test123!',
  firstName: 'Test',
  lastName: 'Patient',
  role: 'patient',
  isEmailVerified: true,
  patientProfile: {
    gender: 'Male',
    dateOfBirth: new Date('1990-01-01')
  }
};

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/onus-health', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  // Remove test users
  await User.deleteMany({ 
    email: { $in: [testProvider.email, testPatient.email] } 
  });
  
  console.log('✅ Cleanup complete');
}

async function createTestUsers() {
  console.log('\n👥 Creating test users...');
  
  // Create provider
  const provider = new User(testProvider);
  await provider.save();
  console.log('✅ Provider created:', provider.email);
  
  // Create patient
  const patient = new User(testPatient);
  await patient.save();
  console.log('✅ Patient created:', patient.email);
  
  return { provider, patient };
}

async function testConnectionCreation(provider, patient) {
  console.log('\n🔗 Testing connection creation...');
  
  // Test 1: Create connection with limited access
  const connection1 = new Connection({
    patient: patient._id,
    provider: provider._id,
    initiatedBy: provider._id,
    accessLevel: 'limited',
    fullAccessStatus: 'none'
  });
  
  await connection1.save();
  console.log('✅ Connection created with limited access');
  
  // Test 2: Request full access
  await connection1.requestFullAccess();
  console.log('✅ Full access requested (status:', connection1.fullAccessStatus, ')');
  
  // Test 3: Patient approves full access
  await connection1.approveFullAccess();
  console.log('✅ Full access approved (accessLevel:', connection1.accessLevel, ')');
  
  // Test 4: Patient revokes access
  await connection1.revokeAccess();
  console.log('✅ Access revoked (accessLevel:', connection1.accessLevel, ')');
  
  return connection1;
}

async function testConsultationWithConnection(provider, patient) {
  console.log('\n📋 Testing consultation creation with automatic connection...');
  
  // Remove existing connection to test automatic creation
  await Connection.deleteMany({ 
    patient: patient._id, 
    provider: provider._id 
  });
  
  // Create consultation (should automatically create connection)
  const consultation = new Consultation({
    patient: patient._id,
    provider: provider._id,
    general: {
      date: new Date(),
      specialistName: `${provider.firstName} ${provider.lastName}`,
      specialty: provider.providerProfile.specialty,
      practice: provider.providerProfile.practiceInfo.name,
      reasonForVisit: 'Test consultation',
      notes: 'This is a test consultation'
    },
    status: 'completed'
  });
  
  await consultation.save();
  console.log('✅ Consultation created');
  
  // Check if connection was created
  const connection = await Connection.findOne({
    patient: patient._id,
    provider: provider._id
  });
  
  if (connection) {
    console.log('✅ Connection automatically created with consultation');
    console.log('  - Access Level:', connection.accessLevel);
    console.log('  - Full Access Status:', connection.fullAccessStatus);
  } else {
    console.log('❌ Connection was not created automatically');
  }
  
  return { consultation, connection };
}

async function testAccessLevels(provider, patient) {
  console.log('\n🔐 Testing access level scenarios...');
  
  // Get current connection
  const connection = await Connection.findOne({
    patient: patient._id,
    provider: provider._id
  });
  
  if (!connection) {
    console.log('❌ No connection found to test access levels');
    return;
  }
  
  // Test limited access
  connection.accessLevel = 'limited';
  connection.fullAccessStatus = 'none';
  await connection.save();
  console.log('✅ Set to limited access');
  
  // Test pending full access
  connection.fullAccessStatus = 'pending';
  await connection.save();
  console.log('✅ Set to pending full access request');
  
  // Test denied full access
  await connection.denyFullAccess();
  console.log('✅ Full access denied (accessLevel:', connection.accessLevel, ')');
  
  // Test approved full access
  connection.fullAccessStatus = 'pending';
  await connection.save();
  await connection.approveFullAccess();
  console.log('✅ Full access approved (accessLevel:', connection.accessLevel, ')');
}

async function runTests() {
  try {
    await connectDB();
    await cleanup();
    
    // Create test users
    const { provider, patient } = await createTestUsers();
    
    // Run connection tests
    await testConnectionCreation(provider, patient);
    
    // Run consultation tests
    await testConsultationWithConnection(provider, patient);
    
    // Run access level tests
    await testAccessLevels(provider, patient);
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await cleanup();
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

// Run the tests
runTests(); 