/**
 * Email Service
 * Handles email sending functionality with multiple providers, retry logic, and queue
 */

const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
const config = require('../config/environment');
const logger = require('../utils/logger');
const { renderTemplate, getPlainTextFromHtml } = require('../utils/templateRenderer');
const EmailQueue = require('../models/EmailQueue');

// Initialize SendGrid if API key is provided
if (config.sendgridApiKey && config.sendgridApiKey.startsWith('SG.')) {
  sgMail.setApiKey(config.sendgridApiKey);
} else {
  // Log warning but don't crash
  console.warn('Valid SendGrid API key not provided. Email sending via SendGrid will be disabled.');
}

// Initialize nodemailer transporter
let transporter = null;
if (config.smtp && config.smtp.host) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.auth.user,
      pass: config.smtp.auth.pass
    }
  });
}

/**
 * Send an email using the configured provider
 * @param {Object} emailData - Email data including to, subject, html, etc.
 * @returns {Promise<boolean>} Success status
 */
const sendEmail = async (emailData) => {
  // Skip sending in test mode unless force is specified
  if (config.testMode && !emailData.force) {
    logger.info('Test mode: Email sending skipped', { to: emailData.to, subject: emailData.subject });
    return true;
  }

  try {
    // Add default from address if not specified
    const email = {
      ...emailData,
      from: emailData.from || config.emailFrom
    };

    // Add plain text version if not provided
    if (email.html && !email.text) {
      email.text = getPlainTextFromHtml(email.html);
    }

    // Determine which provider to use
    const provider = emailData.provider || config.mailProvider;

    if (provider === 'sendgrid' && config.sendgridApiKey && config.sendgridApiKey.startsWith('SG.')) {
      await sgMail.send(email);
      logger.info(`Email sent successfully via SendGrid to ${email.to}`);
      return true;
    } else if (provider === 'nodemailer' && transporter) {
      await transporter.sendMail(email);
      logger.info(`Email sent successfully via Nodemailer to ${email.to}`);
      return true;
    } else {
      // If we're in test or development mode, just log the email
      if (config.env === 'development' || config.env === 'test') {
        logger.info(`[DEV MODE] Email would have been sent to: ${email.to}`, { 
          subject: email.subject,
          text: email.text.substring(0, 100) + '...' 
        });
        return true;
      }
      throw new Error('No email provider configured correctly');
    }
  } catch (error) {
    logger.error('Error sending email:', error);
    
    // Try fallback provider if available
    if (emailData.provider !== 'fallback') {
      try {
        logger.info('Attempting to send email using fallback provider');
        
        // Switch providers
        const fallbackProvider = config.mailProvider === 'sendgrid' ? 'nodemailer' : 'sendgrid';
        
        // Check if fallback provider is available
        if (
          (fallbackProvider === 'sendgrid' && config.sendgridApiKey && config.sendgridApiKey.startsWith('SG.')) || 
          (fallbackProvider === 'nodemailer' && transporter)
        ) {
          return await sendEmail({
            ...emailData,
            provider: 'fallback',
            fallbackProvider
          });
        }
      } catch (fallbackError) {
        logger.error('Fallback email provider also failed:', fallbackError);
      }
    }
    
    return false;
  }
};

/**
 * Queue an email for sending
 * @param {Object} emailData - Email data
 * @param {Object} options - Queue options (priority, userId, etc.)
 * @returns {Promise<Object>} Created queue item
 */
const queueEmail = async (emailData, options = {}) => {
  try {
    // Create a queue entry
    const queueEntry = new EmailQueue({
      to: emailData.to,
      from: emailData.from || config.emailFrom,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text || getPlainTextFromHtml(emailData.html),
      priority: options.priority || 0,
      userId: options.userId,
      template: options.template,
      templateData: options.templateData,
      maxAttempts: options.maxAttempts || config.emailQueueSettings.maxAttempts
    });
    
    // Save to database
    await queueEntry.save();
    logger.info(`Email queued successfully to ${emailData.to}`);
    
    return queueEntry;
  } catch (error) {
    logger.error('Error queueing email:', error);
    throw error;
  }
};

/**
 * Process the email queue
 * @returns {Promise<number>} Number of emails processed
 */
const processEmailQueue = async () => {
  const now = new Date();
  let processedCount = 0;
  
  try {
    // Find emails that are pending and due for processing
    const pendingEmails = await EmailQueue.find({
      status: 'pending',
      $or: [
        { nextAttempt: { $lte: now } },
        { nextAttempt: { $exists: false } }
      ]
    }).sort({ priority: -1, createdAt: 1 }).limit(10);
    
    for (const email of pendingEmails) {
      // Update status to processing
      email.status = 'processing';
      email.lastAttempt = now;
      email.attempts += 1;
      await email.save();
      
      try {
        // Send the email
        const success = await sendEmail({
          to: email.to,
          from: email.from,
          subject: email.subject,
          html: email.html,
          text: email.text
        });
        
        if (success) {
          // Mark as sent
          email.status = 'sent';
          await email.save();
          processedCount++;
        } else {
          // Handle failure
          if (email.attempts >= email.maxAttempts) {
            email.status = 'failed';
            email.error = 'Max retry attempts reached';
          } else {
            email.status = 'pending';
            // Calculate next retry time based on attempts
            const retryIndex = Math.min(email.attempts - 1, config.emailQueueSettings.retryIntervals.length - 1);
            const retryMinutes = config.emailQueueSettings.retryIntervals[retryIndex];
            email.nextAttempt = new Date(now.getTime() + retryMinutes * 60000);
            email.error = 'Failed to send, will retry';
          }
          await email.save();
        }
      } catch (error) {
        // Handle unexpected errors
        logger.error(`Error processing email queue item ${email._id}:`, error);
        email.status = email.attempts >= email.maxAttempts ? 'failed' : 'pending';
        email.error = error.message;
        
        if (email.status === 'pending') {
          const retryIndex = Math.min(email.attempts - 1, config.emailQueueSettings.retryIntervals.length - 1);
          const retryMinutes = config.emailQueueSettings.retryIntervals[retryIndex];
          email.nextAttempt = new Date(now.getTime() + retryMinutes * 60000);
        }
        
        await email.save();
      }
    }
    
    return processedCount;
  } catch (error) {
    logger.error('Error processing email queue:', error);
    return 0;
  }
};

/**
 * Start the email queue processor
 */
const startEmailQueueProcessor = () => {
  const processInterval = config.emailQueueSettings.processInterval;
  
  // Don't start processor in test mode
  if (config.testMode) {
    logger.info('Test mode: Email queue processor not started');
    return null;
  }
  
  logger.info(`Starting email queue processor with interval: ${processInterval}ms`);
  
  const intervalId = setInterval(async () => {
    try {
      const processed = await processEmailQueue();
      if (processed > 0) {
        logger.info(`Processed ${processed} emails from queue`);
      }
    } catch (error) {
      logger.error('Error in email queue processor:', error);
    }
  }, processInterval);
  
  return intervalId;
};

/**
 * Send a template-based email
 * @param {string} to - Recipient email
 * @param {string} templateName - Name of the template file (without extension)
 * @param {Object} templateData - Data to render in the template
 * @param {Object} options - Additional options (subject, from, queue, etc.)
 * @returns {Promise<boolean>} Success status
 */
const sendTemplateEmail = async (to, templateName, templateData, options = {}) => {
  try {
    // Render the template
    const html = await renderTemplate(templateName, templateData);
    
    if (!html) {
      throw new Error(`Failed to render template: ${templateName}`);
    }
    
    const emailData = {
      to,
      subject: options.subject || 'Onus Health Notification',
      html,
      from: options.from || config.emailFrom
    };
    
    // Queue the email or send immediately
    if (options.queue) {
      await queueEmail(emailData, {
        priority: options.priority,
        userId: options.userId,
        template: templateName,
        templateData
      });
      return true;
    } else {
      return await sendEmail(emailData);
    }
  } catch (error) {
    logger.error(`Error sending template email (${templateName}):`, error);
    return false;
  }
};

/**
 * Send a verification email to a user
 * @param {Object} user - User object
 * @param {string} token - Verification token
 * @param {Object} options - Additional options
 * @returns {Promise<boolean>} Success status
 */
const sendVerificationEmail = async (user, token, options = {}) => {
      const verificationUrl = `${config.frontendUrl}/verify-email/${token}`;
  
  return await sendTemplateEmail(
    user.email,
    'verification',
    {
      firstName: user.firstName,
      verificationUrl,
      title: 'Verify Your Email - Onus Health'
    },
    {
      subject: 'Verify Your Email - Onus Health',
      userId: user._id,
      priority: 1, // High priority
      queue: options.queue !== false, // Queue by default
      ...options
    }
  );
};

/**
 * Send a password reset email to a user
 * @param {Object} user - User object
 * @param {string} token - Reset token
 * @param {Object} options - Additional options
 * @returns {Promise<boolean>} Success status
 */
const sendPasswordResetEmail = async (user, token, options = {}) => {
  const resetUrl = `${config.frontendUrl}/reset-password/${token}`;
  
  return await sendTemplateEmail(
    user.email,
    'passwordReset',
    {
      firstName: user.firstName,
      resetUrl,
      title: 'Reset Your Password - Onus Health',
      expiryTime: '1 hour'
    },
    {
      subject: 'Password Reset - Onus Health',
      userId: user._id,
      priority: 1, // High priority
      queue: options.queue !== false, // Queue by default
      ...options
    }
  );
};

/**
 * Send a connection request notification to a patient
 * @param {Object} patient - Patient user
 * @param {Object} provider - Provider user
 * @param {Object} options - Additional options
 * @returns {Promise<boolean>} Success status
 */
const sendConnectionRequestEmail = async (patient, provider, options = {}) => {
  const connectionUrl = `${config.frontendUrl}/dashboard/connections`;
  
  return await sendTemplateEmail(
    patient.email,
    'accessRequest',
    {
      patientName: patient.firstName,
      providerName: `${provider.firstName} ${provider.lastName}`,
      title: provider.title || 'Dr.',
      specialty: provider.providerProfile?.specialty || 'Healthcare Provider',
      practiceName: provider.providerProfile?.practiceInfo?.name || '',
      connectionUrl,
      title: 'Connection Request - Onus Health'
    },
    {
      subject: 'New Connection Request - Onus Health',
      userId: patient._id,
      queue: options.queue !== false, // Queue by default
      ...options
    }
  );
};

/**
 * Send a new consultation notification to a patient
 * @param {Object} patient - Patient user
 * @param {Object} provider - Provider user
 * @param {Object} consultation - Consultation object
 * @param {Object} options - Additional options
 * @returns {Promise<boolean>} Success status
 */
const sendConsultationNotificationEmail = async (patient, provider, consultation, options = {}) => {
  const consultationUrl = `${config.frontendUrl}/dashboard/consultations/${consultation._id}`;
  
  return await sendTemplateEmail(
    patient.email,
    'consultationNotification',
    {
      patientName: patient.firstName,
      providerName: `${provider.firstName} ${provider.lastName}`,
      specialty: provider.providerProfile?.specialty || 'Healthcare Provider',
      consultationDate: new Date(consultation.date).toLocaleDateString(),
      reasonForVisit: consultation.general.reasonForVisit,
      consultationUrl,
      title: 'New Consultation - Onus Health'
    },
    {
      subject: 'New Medical Consultation - Onus Health',
      userId: patient._id,
      queue: options.queue !== false, // Queue by default
      ...options
    }
  );
};

/**
 * Send provider verification request to admin
 * @param {Object} provider - Provider user document
 * @returns {Promise<boolean>} Success status
 */
const sendProviderVerificationRequestEmail = async (provider, options = {}) => {
  if (!provider) {
    throw new Error('Provider information is required');
  }

  // Admin emails
  const adminEmails = ['rowan.franciscus.2@gmail.com', 'julian@onus.health'];
  // Use the first admin email for now (can be extended to send to all admins)
  const adminEmail = adminEmails[0];
  
  logger.info(`Sending provider verification request to admin email: ${adminEmail}`);
  
  // Link to the provider verification requests page instead of dashboard
  const adminUrl = `${config.frontendUrl}/admin/provider-verifications`;
  
  const templateData = {
    adminName: 'Admin',
    providerName: `${provider.firstName} ${provider.lastName}`,
    providerEmail: provider.email,
    specialty: provider.providerProfile?.specialty || 'Not specified',
    practiceName: provider.providerProfile?.practiceInfo?.name || 'Not specified',
    experience: provider.providerProfile?.yearsOfExperience || 'Not specified',
    verificationLink: adminUrl,
    appName: 'Onus Health',
    supportEmail: config.supportEmail || 'support@onus.health'
  };

  try {
    // Force send the email immediately instead of queuing
    const sent = await sendEmail({
      to: adminEmail,
      subject: 'New Provider Verification Request',
      html: `
        <h1>New Provider Verification Request</h1>
        <p>A new provider has submitted a verification request:</p>
        <ul>
          <li><strong>Name:</strong> ${provider.firstName} ${provider.lastName}</li>
          <li><strong>Email:</strong> ${provider.email}</li>
          <li><strong>Specialty:</strong> ${provider.providerProfile?.specialty || 'Not specified'}</li>
          <li><strong>Practice:</strong> ${provider.providerProfile?.practiceInfo?.name || 'Not specified'}</li>
        </ul>
        <p>Please <a href="${adminUrl}">click here</a> to review provider verification requests.</p>
      `,
      force: true // Force send even in test mode
    });
    
    logger.info(`Admin notification ${sent ? 'sent successfully' : 'failed to send'} to ${adminEmail}`);
    
    return sent;
  } catch (error) {
    logger.error(`Failed to send provider verification email to admin: ${error.message}`);
    return false;
  }
};

/**
 * Send provider verification approval email
 * @param {Object} provider - Provider user document
 */
const sendProviderVerificationApprovalEmail = async (provider, options = {}) => {
  if (!provider) {
    throw new Error('Provider information is required');
  }

  logger.info(`Sending provider verification approval email to ${provider.email}`);
  
  const loginUrl = `${config.frontendUrl}/sign-in`;
  
  const templateData = {
    providerName: provider.firstName,
    loginLink: loginUrl,
    appName: 'Onus Health',
    supportEmail: config.supportEmail || 'support@onus.health'
  };

  try {
    // Force send the email immediately without queuing to ensure it gets sent
    const result = await sendEmail({
      to: provider.email,
      subject: 'Your Provider Account Has Been Approved',
      html: await renderTemplate('providerVerificationApproval', templateData),
      force: true // Force send even in test mode
    });
    
    logger.info(`Provider approval email ${result ? 'sent successfully' : 'failed'} to ${provider.email}`);
    return result;
  } catch (error) {
    logger.error(`Failed to send provider approval email: ${error.message}`, error);
    return false;
  }
};

/**
 * Send provider verification rejection email
 * @param {Object} provider - Provider user document
 * @param {String} rejectionReason - Reason for rejecting verification
 */
const sendProviderVerificationRejectionEmail = async (provider, rejectionReason, options = {}) => {
  if (!provider) {
    throw new Error('Provider information is required');
  }

  logger.info(`Sending provider verification rejection email to ${provider.email}`);
  
  const contactUrl = `${config.frontendUrl}/contact`;
  
  const templateData = {
    providerName: provider.firstName,
    rejectionReason: rejectionReason || 'Your application did not meet our current requirements',
    contactLink: contactUrl,
    appName: 'Onus Health',
    supportEmail: config.supportEmail || 'support@onus.health'
  };

  try {
    // Force send the email immediately without queuing to ensure it gets sent
    const result = await sendEmail({
      to: provider.email,
      subject: 'Your Provider Verification Status',
      html: await renderTemplate('providerVerificationRejection', templateData),
      force: true // Force send even in test mode
    });
    
    logger.info(`Provider rejection email ${result ? 'sent successfully' : 'failed'} to ${provider.email}`);
    return result;
  } catch (error) {
    logger.error(`Failed to send provider rejection email: ${error.message}`, error);
    return false;
  }
};

/**
 * Get the status of the email service
 * @returns {Object} Service status information
 */
const getEmailServiceStatus = async () => {
  const pendingCount = await EmailQueue.countDocuments({ status: 'pending' });
  const processingCount = await EmailQueue.countDocuments({ status: 'processing' });
  const sentCount = await EmailQueue.countDocuments({ status: 'sent' });
  const failedCount = await EmailQueue.countDocuments({ status: 'failed' });
  
  // Check providers
  const providersStatus = {
    sendgrid: !!config.sendgridApiKey && config.sendgridApiKey.startsWith('SG.'),
    nodemailer: !!(config.smtp && config.smtp.host && config.smtp.auth && config.smtp.auth.user)
  };
  
  return {
    providers: providersStatus,
    testMode: config.testMode,
    queueStats: {
      pending: pendingCount,
      processing: processingCount,
      sent: sentCount,
      failed: failedCount,
      total: pendingCount + processingCount + sentCount + failedCount
    }
  };
};

// Create a mock email service for testing
const mockEmailService = {
  sendEmail: async (emailData) => {
    logger.info('MOCK: Email would be sent', { to: emailData.to, subject: emailData.subject });
    return true;
  },
  sendVerificationEmail: async (user, token) => {
    logger.info(`MOCK: Verification email would be sent to ${user.email} with token: ${token}`);
    return true;
  },
  sendPasswordResetEmail: async (user, token) => {
    logger.info(`MOCK: Password reset email would be sent to ${user.email} with token: ${token}`);
    return true;
  },
  sendConnectionRequestEmail: async (patient, provider) => {
    logger.info(`MOCK: Connection request email would be sent to ${patient.email} from provider ${provider.firstName} ${provider.lastName}`);
    return true;
  },
  sendConsultationNotificationEmail: async (patient, provider, consultation) => {
    logger.info(`MOCK: Consultation notification email would be sent to ${patient.email}`);
    return true;
  },
  sendProviderVerificationRequestEmail: async (provider) => {
    logger.info(`MOCK: Provider verification request email would be sent for ${provider.email}`);
    return true;
  },
  queueEmail: async (emailData) => {
    logger.info('MOCK: Email would be queued', { to: emailData.to, subject: emailData.subject });
    return { _id: 'mock-id', ...emailData };
  },
  processEmailQueue: async () => {
    logger.info('MOCK: Email queue would be processed');
    return 0;
  },
  getEmailServiceStatus: async () => {
    return {
      providers: { sendgrid: false, nodemailer: false },
      testMode: true,
      queueStats: { pending: 0, processing: 0, sent: 0, failed: 0, total: 0 }
    };
  }
};

// Export the actual service or mock service based on config
module.exports = config.testMode ? mockEmailService : {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendConnectionRequestEmail,
  sendConsultationNotificationEmail,
  sendProviderVerificationRequestEmail,
  sendProviderVerificationApprovalEmail,
  sendProviderVerificationRejectionEmail,
  sendTemplateEmail,
  queueEmail,
  processEmailQueue,
  startEmailQueueProcessor,
  getEmailServiceStatus
}; 