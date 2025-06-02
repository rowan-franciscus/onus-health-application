/**
 * Script to check and fix provider data for all provider accounts
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/environment');
const logger = require('../utils/logger');

async function fixAllProviderData() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Find all provider users
    const providers = await User.find({ role: 'provider' });
    
    console.log(`Found ${providers.length} provider accounts to check`);
    
    let fixedCount = 0;
    let alreadyOkCount = 0;
    
    // Process each provider
    for (const provider of providers) {
      console.log(`\nChecking provider: ${provider.email} (${provider._id})`);
      
      let needsFix = false;
      
      // Check if provider profile exists
      if (!provider.providerProfile) {
        console.log(`  - Missing provider profile, will create one`);
        provider.providerProfile = {};
        needsFix = true;
      }
      
      // Check for required fields and fix if needed
      const requiredFields = [
        'specialty', 
        'yearsOfExperience', 
        'practiceLicense', 
        'dataPrivacyPractices'
      ];
      
      for (const field of requiredFields) {
        if (!provider.providerProfile[field]) {
          console.log(`  - Missing required field: ${field}`);
          needsFix = true;
        }
      }
      
      // Check nested objects
      const nestedObjects = [
        'practiceInfo',
        'patientManagement',
        'dataPreferences',
        'supportPreferences'
      ];
      
      for (const obj of nestedObjects) {
        if (!provider.providerProfile[obj] || typeof provider.providerProfile[obj] !== 'object') {
          console.log(`  - Missing or invalid nested object: ${obj}`);
          needsFix = true;
        }
      }
      
      // If needs fixing, update the profile
      if (needsFix) {
        console.log(`  - Fixing provider profile for ${provider.email}`);
        
        provider.providerProfile = {
          // Professional Information fields
          specialty: String(provider.providerProfile?.specialty || 'General Medicine'),
          yearsOfExperience: String(provider.providerProfile?.yearsOfExperience || '5'),
          practiceLicense: String(provider.providerProfile?.practiceLicense || 'License provided'),
          
          // Practice Information
          practiceInfo: {
            name: String(provider.providerProfile?.practiceInfo?.name || 'Health Practice'),
            location: String(provider.providerProfile?.practiceInfo?.location || 'San Francisco, CA'),
            phone: String(provider.providerProfile?.practiceInfo?.phone || '555-123-4567'),
            email: String(provider.providerProfile?.practiceInfo?.email || provider.email)
          },
          
          // Patient Management
          patientManagement: {
            averagePatients: String(provider.providerProfile?.patientManagement?.averagePatients || '20'),
            collaboration: String(provider.providerProfile?.patientManagement?.collaboration || 'Yes')
          },
          
          // Data Access Preferences
          dataPreferences: {
            criticalInfo: Array.isArray(provider.providerProfile?.dataPreferences?.criticalInformation)
              ? provider.providerProfile.dataPreferences.criticalInformation.join(', ')
              : String(provider.providerProfile?.dataPreferences?.criticalInfo || 'Medications, Allergies, Medical History'),
            historicalData: String(provider.providerProfile?.dataPreferences?.historicalData || 'Yes')
          },
          
          // Data Privacy Practices - field name must match admin view
          privacyPractices: String(provider.providerProfile?.dataPrivacyPractices || 
                                  provider.providerProfile?.privacyPractices || 
                                  'HIPAA Compliant'),
          
          // Support & Communication
          communication: {
            supportPreference: String(provider.providerProfile?.supportPreferences?.technicalSupportPreference || 
                                    provider.providerProfile?.communication?.supportPreference || 
                                    'Email'),
            trainingRequired: String(provider.providerProfile?.supportPreferences?.requiresTraining || 
                                   provider.providerProfile?.communication?.trainingRequired || 
                                   'Yes'),
            updatePreference: String(provider.providerProfile?.supportPreferences?.updatePreference || 
                                   provider.providerProfile?.communication?.updatePreference || 
                                   'Email')
          },
          
          // Verification status (preserve existing or default to false)
          isVerified: provider.providerProfile?.isVerified === true || false
        };
        
        // Make sure profile is marked as completed if it has a provider profile
        provider.isProfileCompleted = true;
        
        // Save the changes
        await provider.save();
        console.log(`  - Fixed and saved provider profile for ${provider.email}`);
        fixedCount++;
      } else {
        console.log(`  - Provider profile for ${provider.email} looks good, no changes needed`);
        alreadyOkCount++;
      }
    }
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total providers checked: ${providers.length}`);
    console.log(`Providers fixed: ${fixedCount}`);
    console.log(`Providers already OK: ${alreadyOkCount}`);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the function
fixAllProviderData(); 