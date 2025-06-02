/**
 * Test Email Verification Script
 * 
 * This script sends a test verification email to the specified email address.
 * Run with: node scripts/testEmailVerification.js
 */

const emailService = require('../services/email.service');
const mongoose = require('mongoose');
const config = require('../config/environment');
const logger = require('../utils/logger');
const { renderTemplate, getPlainTextFromHtml } = require('../utils/templateRenderer');

// Create a mock user for the verification email
const mockUser = {
  _id: new mongoose.Types.ObjectId(),
  firstName: 'Test',
  lastName: 'User',
  email: 'rowan.franciscus@gmail.com'
};

// Create a mock verification token
const mockToken = 'test-verification-token-12345';

async function testVerificationEmail() {
  try {
    logger.info('Starting email verification test');
    logger.info(`Email provider: ${config.mailProvider}`);
    logger.info(`Send from: ${config.emailFrom}`);
    
    // Check if SendGrid API key is configured
    if (config.mailProvider === 'sendgrid' && (!config.sendgridApiKey || !config.sendgridApiKey.startsWith('SG.'))) {
      logger.error('SendGrid API key is missing or invalid');
      return;
    }

    // Instead of using the queue-based sendVerificationEmail, we'll directly use sendEmail
    // Prepare verification email template data
    const verifyUrl = `${config.frontendUrl}/verify-email?token=${mockToken}`;
    const templateData = {
      firstName: mockUser.firstName,
      verifyUrl,
      logoUrl: config.logoUrl,
      appName: 'Onus Health'
    };

    // Render the email template
    const html = await renderTemplate('verification', templateData);
    
    // Send email directly without using the queue
    const result = await emailService.sendEmail({
      to: mockUser.email,
      subject: 'Verify Your Email Address',
      html,
      force: true  // Force sending even in test mode
    });
    
    if (result) {
      logger.info(`Verification email successfully sent to ${mockUser.email}`);
    } else {
      logger.error(`Failed to send verification email to ${mockUser.email}`);
    }
  } catch (error) {
    logger.error('Error sending verification email:', error);
  } finally {
    // Exit the process
    process.exit();
  }
}

// Run the test
testVerificationEmail(); 