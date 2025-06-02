/**
 * Script to fix provider data for a specific user
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/environment');
const logger = require('../utils/logger');

async function fixProviderData() {
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

    console.log('=== CURRENT USER DATA ===');
    console.log(`ID: ${user._id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Role: ${user.role}`);
    console.log(`Email Verified: ${user.isEmailVerified}`);
    console.log(`Profile Completed: ${user.isProfileCompleted}`);
    
    console.log('\n=== CURRENT PROVIDER PROFILE DATA ===');
    if (user.providerProfile) {
      console.log('Provider Profile:', JSON.stringify(user.providerProfile, null, 2));
    } else {
      console.log('Provider profile not found');
      user.providerProfile = {};
    }

    // Create or update the provider profile with the correct structure
    const providerProfile = {
      ...user.providerProfile,
      
      // Ensure specialty is a string
      specialty: user.providerProfile?.specialty || 'General Medicine',
      
      // Ensure yearsOfExperience is a number
      yearsOfExperience: Number(user.providerProfile?.yearsOfExperience) || 5,
      
      // Fix practiceLicense if it's an object
      practiceLicense: typeof user.providerProfile?.practiceLicense === 'object'
        ? 'LIC12345' // Replace with a valid license string
        : String(user.providerProfile?.practiceLicense || 'LIC12345'),
      
      // Practice Information
      practiceInfo: {
        name: user.providerProfile?.practiceInfo?.name || 
              user.providerProfile?.practiceInfo?.practiceName || 
              'Health Practice',
        location: user.providerProfile?.practiceInfo?.location || 
                  user.providerProfile?.practiceInfo?.practiceLocation || 
                  'San Francisco, CA',
        phone: user.providerProfile?.practiceInfo?.phone || '555-123-4567',
        email: user.providerProfile?.practiceInfo?.email || user.email
      },
      
      // Patient Management
      patientManagement: {
        averagePatients: isNaN(Number(user.providerProfile?.patientManagement?.averagePatients))
          ? 0
          : Number(user.providerProfile?.patientManagement?.averagePatients),
        collaboratesWithOthers: 
          typeof user.providerProfile?.patientManagement?.collaboratesWithOthers === 'string'
            ? user.providerProfile?.patientManagement?.collaboratesWithOthers === 'true'
            : !!user.providerProfile?.patientManagement?.collaboratesWithOthers
      },
      
      // Data Access Preferences
      dataPreferences: {
        criticalInformation: Array.isArray(user.providerProfile?.dataPreferences?.criticalInformation) 
          ? user.providerProfile.dataPreferences.criticalInformation 
          : Array.isArray(user.providerProfile?.dataPreferences?.criticalInfo)
            ? user.providerProfile.dataPreferences.criticalInfo
            : ['Medications', 'Allergies', 'Medical History'],
        requiresHistoricalData: user.providerProfile?.dataPreferences?.requiresHistoricalData === true || 
                                user.providerProfile?.dataPreferences?.historicalData === true || 
                                true
      },
      
      // Ensure dataPrivacyPractices is set if missing
      dataPrivacyPractices: user.providerProfile.dataPrivacyPractices || 'HIPAA and local health data regulations',
      
      // Support & Communication
      supportPreferences: {
        technicalSupportPreference: user.providerProfile?.supportPreferences?.technicalSupportPreference || 
                                    user.providerProfile?.supportPreferences?.technicalSupport || 
                                    'Email',
        requiresTraining: user.providerProfile?.supportPreferences?.requiresTraining === true || 
                         user.providerProfile?.supportPreferences?.trainingRequired === true || 
                         true,
        updatePreference: user.providerProfile?.supportPreferences?.updatePreference || 
                         user.providerProfile?.supportPreferences?.updates || 
                         'Email'
      },
      
      // Verification status (preserve existing or default to false)
      isVerified: user.providerProfile?.isVerified === true || false
    };
    
    // Update the user's provider profile
    user.providerProfile = providerProfile;
    
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
fixProviderData(); 