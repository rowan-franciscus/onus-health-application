#!/usr/bin/env node

/**
 * Script to fix provider training field that might have been saved as string instead of boolean
 * Run with: node server/scripts/fixProviderTrainingField.js
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('../utils/logger');

async function fixProviderTrainingField() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/onus-health', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    logger.info('Connected to MongoDB');
    
    // Find all providers with string requiresTraining values
    const providers = await User.find({
      role: 'provider',
      'providerProfile.supportPreferences.requiresTraining': { $type: 'string' }
    });
    
    logger.info(`Found ${providers.length} providers with string requiresTraining values`);
    
    let fixedCount = 0;
    
    for (const provider of providers) {
      const currentValue = provider.providerProfile?.supportPreferences?.requiresTraining;
      logger.info(`Processing provider ${provider.email} with requiresTraining value: "${currentValue}"`);
      
      // Convert string to boolean
      let booleanValue = false;
      
      if (currentValue && typeof currentValue === 'string') {
        // Check for positive indicators
        booleanValue = /^(yes|y|true|1|require|need|would like|please)/i.test(currentValue.trim());
      }
      
      // Update the field
      provider.providerProfile.supportPreferences.requiresTraining = booleanValue;
      
      await provider.save();
      fixedCount++;
      
      logger.info(`Fixed provider ${provider.email} - requiresTraining set to: ${booleanValue}`);
    }
    
    logger.info(`Successfully fixed ${fixedCount} provider records`);
    
    // Also check for any providers with missing supportPreferences structure
    const providersWithMissingStructure = await User.find({
      role: 'provider',
      'providerProfile.supportPreferences': { $exists: false }
    });
    
    if (providersWithMissingStructure.length > 0) {
      logger.info(`Found ${providersWithMissingStructure.length} providers with missing supportPreferences structure`);
      
      for (const provider of providersWithMissingStructure) {
        if (!provider.providerProfile) {
          provider.providerProfile = {};
        }
        
        if (!provider.providerProfile.supportPreferences) {
          provider.providerProfile.supportPreferences = {
            technicalSupportPreference: '',
            requiresTraining: false,
            updatePreference: ''
          };
          
          await provider.save();
          logger.info(`Added supportPreferences structure for provider ${provider.email}`);
        }
      }
    }
    
  } catch (error) {
    logger.error('Error fixing provider training field:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
fixProviderTrainingField(); 