/**
 * Test All Email Templates Script
 * 
 * This script sends test emails using all available email templates.
 * Run with: node scripts/testAllEmails.js <email>
 */

const emailService = require('../services/email.service');
const mongoose = require('mongoose');
const config = require('../config/environment');
const logger = require('../utils/logger');
const { renderTemplate } = require('../utils/templateRenderer');

// Get the target email from command line args or use default
const targetEmail = process.argv[2] || 'rowan.franciscus@gmail.com';

// Create mock data objects
const mockUser = {
  _id: new mongoose.Types.ObjectId(),
  firstName: 'Test',
  lastName: 'User',
  email: targetEmail,
  role: 'patient'
};

const mockProvider = {
  _id: new mongoose.Types.ObjectId(),
  firstName: 'Doctor',
  lastName: 'Smith',
  email: targetEmail,
  role: 'provider',
  specialty: 'General Practitioner',
  practiceName: 'Health Clinic'
};

const mockConsultation = {
  _id: new mongoose.Types.ObjectId(),
  date: new Date(),
  reason: 'Annual Checkup'
};

// Token for password reset / verification
const mockToken = 'test-token-12345';

async function sendTestEmail(templateName, subject, templateData) {
  try {
    // Render the email template
    const html = await renderTemplate(templateName, {
      ...templateData,
      logoUrl: config.logoUrl,
      appName: 'Onus Health'
    });
    
    // Send email directly
    const result = await emailService.sendEmail({
      to: targetEmail,
      subject: subject,
      html,
      force: true  // Force sending even in test mode
    });
    
    if (result) {
      logger.info(`${templateName} email successfully sent to ${targetEmail}`);
      return true;
    } else {
      logger.error(`Failed to send ${templateName} email to ${targetEmail}`);
      return false;
    }
  } catch (error) {
    logger.error(`Error sending ${templateName} email:`, error);
    return false;
  }
}

async function testAllEmails() {
  try {
    logger.info('Starting email template test suite');
    logger.info(`Email provider: ${config.mailProvider}`);
    logger.info(`Send from: ${config.emailFrom}`);
    logger.info(`Target email: ${targetEmail}`);
    
    // Check if SendGrid API key is configured
    if (config.mailProvider === 'sendgrid' && (!config.sendgridApiKey || !config.sendgridApiKey.startsWith('SG.'))) {
      logger.error('SendGrid API key is missing or invalid');
      return;
    }

    // Test 1: Verification Email
    const verifyUrl = `${config.frontendUrl}/verify-email?token=${mockToken}`;
    await sendTestEmail('verification', 'Verify Your Email Address', {
      firstName: mockUser.firstName,
      verifyUrl
    });

    // Test 2: Password Reset Email
    const resetUrl = `${config.frontendUrl}/reset-password?token=${mockToken}`;
    await sendTestEmail('passwordReset', 'Reset Your Password', {
      firstName: mockUser.firstName,
      resetUrl
    });

    // Test 3: Access Request (Connection request)
    const approveUrl = `${config.frontendUrl}/connections?action=approve&id=${mockProvider._id}`;
    const denyUrl = `${config.frontendUrl}/connections?action=deny&id=${mockProvider._id}`;
    await sendTestEmail('accessRequest', 'New Provider Connection Request', {
      firstName: mockUser.firstName,
      providerName: `${mockProvider.firstName} ${mockProvider.lastName}`,
      providerSpecialty: mockProvider.specialty,
      approveUrl,
      denyUrl
    });

    // Test 4: Consultation Notification
    const consultationUrl = `${config.frontendUrl}/consultations/${mockConsultation._id}`;
    await sendTestEmail('consultationNotification', 'New Consultation Added', {
      firstName: mockUser.firstName,
      providerName: `${mockProvider.firstName} ${mockProvider.lastName}`,
      consultationDate: mockConsultation.date.toLocaleDateString(),
      consultationReason: mockConsultation.reason,
      consultationUrl
    });

    // Test 5: Provider Verification
    const adminUrl = `${config.frontendUrl}/admin/providers/requests/${mockProvider._id}`;
    await sendTestEmail('providerVerification', 'New Provider Verification Request', {
      providerName: `${mockProvider.firstName} ${mockProvider.lastName}`,
      providerSpecialty: mockProvider.specialty,
      practiceName: mockProvider.practiceName,
      adminUrl
    });

    logger.info('All test emails have been sent!');
  } catch (error) {
    logger.error('Error in test suite:', error);
  } finally {
    // Exit the process
    process.exit();
  }
}

// Run the test
testAllEmails(); 