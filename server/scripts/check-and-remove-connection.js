/**
 * Script to check and remove connections between specific users
 * Run with: node server/scripts/check-and-remove-connection.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Import models
const User = require('../models/User');
const Connection = require('../models/Connection');
const Consultation = require('../models/Consultation');

// Email addresses to check
const PROVIDER_EMAIL = 'rowan.franciscus.3@gmail.com';
const PATIENT_EMAIL = 'rowan.franciscus.4@gmail.com';

async function connectDB() {
  try {
    // Use the same logic as the main application to get the MongoDB URI
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

async function checkAndRemoveConnections() {
  try {
    console.log('\n🔍 Looking for users...');
    
    // Find the provider
    const provider = await User.findOne({ 
      email: PROVIDER_EMAIL, 
      role: 'provider' 
    });
    
    if (!provider) {
      console.log(`❌ Provider with email ${PROVIDER_EMAIL} not found`);
    } else {
      console.log(`✅ Found provider: ${provider.firstName} ${provider.lastName} (${provider.email})`);
    }
    
    // Find the patient
    const patient = await User.findOne({ 
      email: PATIENT_EMAIL, 
      role: 'patient' 
    });
    
    if (!patient) {
      console.log(`❌ Patient with email ${PATIENT_EMAIL} not found`);
    } else {
      console.log(`✅ Found patient: ${patient.firstName} ${patient.lastName} (${patient.email})`);
    }
    
    if (!provider || !patient) {
      console.log('\n⚠️  Cannot check connections without both users');
      return;
    }
    
    // Check for connections between these two users
    console.log('\n🔗 Checking for connections between these users...');
    
    const connection = await Connection.findOne({
      provider: provider._id,
      patient: patient._id
    });
    
    if (connection) {
      console.log(`✅ Found connection:`);
      console.log(`   - Connection ID: ${connection._id}`);
      console.log(`   - Access Level: ${connection.accessLevel}`);
      console.log(`   - Full Access Status: ${connection.fullAccessStatus}`);
      console.log(`   - Created: ${connection.createdAt}`);
      
      // Remove the connection
      console.log('\n🗑️  Removing connection...');
      await Connection.deleteOne({ _id: connection._id });
      console.log('✅ Connection removed successfully');
    } else {
      console.log('❌ No connection found between these users');
    }
    
    // Check all connections for the provider
    console.log(`\n📊 Checking all connections for provider ${PROVIDER_EMAIL}...`);
    const providerConnections = await Connection.find({ 
      provider: provider._id 
    }).populate('patient', 'firstName lastName email');
    
    if (providerConnections.length > 0) {
      console.log(`Found ${providerConnections.length} connection(s):`);
      providerConnections.forEach(conn => {
        console.log(`   - Patient: ${conn.patient.firstName} ${conn.patient.lastName} (${conn.patient.email})`);
        console.log(`     Access: ${conn.accessLevel}, Status: ${conn.fullAccessStatus}`);
      });
    } else {
      console.log('✅ Provider has no patient connections');
    }
    
    // Check all connections for the patient
    console.log(`\n📊 Checking all connections for patient ${PATIENT_EMAIL}...`);
    const patientConnections = await Connection.find({ 
      patient: patient._id 
    }).populate('provider', 'firstName lastName email');
    
    if (patientConnections.length > 0) {
      console.log(`Found ${patientConnections.length} connection(s):`);
      patientConnections.forEach(conn => {
        console.log(`   - Provider: ${conn.provider.firstName} ${conn.provider.lastName} (${conn.provider.email})`);
        console.log(`     Access: ${conn.accessLevel}, Status: ${conn.fullAccessStatus}`);
      });
    } else {
      console.log('✅ Patient has no provider connections');
    }
    
    // Also check for any consultations between them
    console.log(`\n📋 Checking for consultations between these users...`);
    const consultations = await Consultation.find({
      provider: provider._id,
      patient: patient._id
    });
    
    if (consultations.length > 0) {
      console.log(`⚠️  Found ${consultations.length} consultation(s) between these users`);
      console.log('Note: Consultations were not removed. Only the connection was removed.');
    } else {
      console.log('✅ No consultations found between these users');
    }
    
  } catch (error) {
    console.error('❌ Error during operation:', error);
  }
}

async function main() {
  try {
    await connectDB();
    await checkAndRemoveConnections();
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

// Run the script
main(); 