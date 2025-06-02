/**
 * Test Email Sending Script
 * 
 * This script tests the provider verification email sending functionality
 */

require('dotenv').config();
const mongoose = require('mongoose');
const database = require('../utils/database');
const emailService = require('../services/email.service');
const User = require('../models/User');
const logger = require('../utils/logger');

// Sample provider for testing
const testProvider = {
  email: 'provider.test@email.com',
  firstName: 'Test',
  lastName: 'Provider',
  role: 'provider',
  providerProfile: {
    specialty: 'General Practice',
    practiceInfo: {
      name: 'Test Practice'
    }
  }
};

async function testProviderEmails() {
  try {
    console.log('=== Testing Provider Verification Emails ===');
    
    // Connect to database
    await database.connect();
    console.log('Connected to MongoDB');
    
    // Find a test provider in the database
    let provider = await User.findOne({ email: testProvider.email });
    
    if (!provider) {
      console.log('Test provider not found, using mock provider object');
      provider = testProvider;
    } else {
      console.log(`Using existing provider from database: ${provider.email}`);
    }
    
    // Test approval email
    console.log('\n1. Testing provider verification approval email...');
    const approvalResult = await emailService.sendProviderVerificationApprovalEmail(provider);
    console.log(`Approval email ${approvalResult ? 'sent successfully' : 'failed to send'}`);
    
    // Test rejection email
    console.log('\n2. Testing provider verification rejection email...');
    const rejectionResult = await emailService.sendProviderVerificationRejectionEmail(
      provider, 
      'Your verification could not be approved due to incomplete documentation.'
    );
    console.log(`Rejection email ${rejectionResult ? 'sent successfully' : 'failed to send'}`);
    
    // Get email service status
    console.log('\n3. Getting email service status...');
    const status = await emailService.getEmailServiceStatus();
    console.log('Email service status:', JSON.stringify(status, null, 2));
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Error running test:', error);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('Database connection closed');
    }
  }
}

// Run the test
testProviderEmails(); 