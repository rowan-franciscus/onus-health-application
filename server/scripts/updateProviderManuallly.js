/**
 * Script to manually update provider data for testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/environment');

async function updateProviderManually() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    console.log(`MongoDB URI: ${config.mongoUri}`);
    
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Find user by email
    const email = 'rowan.franciscus.3@gmail.com';
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`User with email ${email} not found`);
      process.exit(1);
    }

    console.log('\n=== CURRENT USER DATA ===');
    console.log(`ID: ${user._id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Role: ${user.role}`);
    
    // Update provider profile with test data
    user.providerProfile = {
      specialty: "Test Specialty",
      yearsOfExperience: 5,
      practiceLicense: "TEST12345",
      
      practiceInfo: {
        name: "Test Practice",
        location: "Test Location, CA",
        phone: "555-123-4567",
        email: user.email
      },
      
      patientManagement: {
        averagePatients: 20,
        collaboratesWithOthers: true
      },
      
      dataPreferences: {
        criticalInformation: ["Medical History", "Allergies", "Medications"],
        requiresHistoricalData: true
      },
      
      dataPrivacyPractices: "HIPAA Compliant",
      
      supportPreferences: {
        technicalSupportPreference: "Email",
        requiresTraining: true,
        updatePreference: "Email"
      },
      
      isVerified: false
    };
    
    // Make sure profile is marked as completed
    user.isProfileCompleted = true;
    
    // Save the changes
    await user.save();
    
    console.log('\n=== UPDATED PROVIDER PROFILE DATA ===');
    console.log('Provider Profile:', JSON.stringify(user.providerProfile, null, 2));
    console.log('\nProvider data has been successfully updated!');
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the function
updateProviderManually(); 