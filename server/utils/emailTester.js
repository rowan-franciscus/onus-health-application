/**
 * Email Testing Utility
 * Provides utilities for testing email functionality without sending actual emails
 */

const { renderTemplate, getPlainTextFromHtml } = require('./templateRenderer');
const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

// Directory to save test emails
const TEST_EMAIL_DIR = path.join(__dirname, '..', 'test-emails');

/**
 * Ensure the test email directory exists
 */
const ensureTestEmailDir = async () => {
  try {
    await fs.ensureDir(TEST_EMAIL_DIR);
  } catch (error) {
    logger.error('Error creating test email directory:', error);
  }
};

// Create the directory when the module loads
ensureTestEmailDir();

/**
 * Save an email to a file for testing purposes
 * @param {Object} emailData - Email data (to, subject, html, etc.)
 * @returns {Promise<string>} Path to the saved file
 */
const saveTestEmail = async (emailData) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}-${emailData.to.replace(/[@.]/g, '-')}.html`;
    const filepath = path.join(TEST_EMAIL_DIR, filename);
    
    // Create a preview version with metadata
    const preview = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Email Preview: ${emailData.subject}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f4f4f4; }
          .metadata { background: #e0e0e0; padding: 10px; margin-bottom: 20px; border-radius: 4px; }
          .email-content { background: white; padding: 20px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="metadata">
          <h2>Email Metadata</h2>
          <p><strong>To:</strong> ${emailData.to}</p>
          <p><strong>From:</strong> ${emailData.from}</p>
          <p><strong>Subject:</strong> ${emailData.subject}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <div class="email-content">
          ${emailData.html}
        </div>
      </body>
      </html>
    `;
    
    await fs.writeFile(filepath, preview);
    logger.info(`Test email saved to ${filepath}`);
    
    return filepath;
  } catch (error) {
    logger.error('Error saving test email:', error);
    return null;
  }
};

/**
 * Preview what an email template would look like with given data
 * @param {string} templateName - Name of the template file (without extension)
 * @param {Object} data - Template data
 * @returns {Promise<string>} Path to the saved preview file
 */
const previewEmailTemplate = async (templateName, data = {}) => {
  try {
    const html = await renderTemplate(templateName, data);
    
    if (!html) {
      throw new Error(`Failed to render template: ${templateName}`);
    }
    
    const emailData = {
      to: data.to || 'preview@example.com',
      from: data.from || 'noreply@onushealth.com',
      subject: data.subject || `Template Preview: ${templateName}`,
      html
    };
    
    return await saveTestEmail(emailData);
  } catch (error) {
    logger.error(`Error previewing template ${templateName}:`, error);
    return null;
  }
};

/**
 * List all saved test emails
 * @returns {Promise<Array>} Array of email file information
 */
const listTestEmails = async () => {
  try {
    const files = await fs.readdir(TEST_EMAIL_DIR);
    
    const emailFiles = await Promise.all(files.map(async (file) => {
      const stats = await fs.stat(path.join(TEST_EMAIL_DIR, file));
      return {
        filename: file,
        path: path.join(TEST_EMAIL_DIR, file),
        createdAt: stats.ctime,
        size: stats.size
      };
    }));
    
    // Sort by creation date (newest first)
    return emailFiles.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    logger.error('Error listing test emails:', error);
    return [];
  }
};

/**
 * Clear all saved test emails
 * @returns {Promise<boolean>} Success status
 */
const clearTestEmails = async () => {
  try {
    const files = await fs.readdir(TEST_EMAIL_DIR);
    
    await Promise.all(files.map(async (file) => {
      await fs.unlink(path.join(TEST_EMAIL_DIR, file));
    }));
    
    logger.info(`Cleared ${files.length} test emails`);
    return true;
  } catch (error) {
    logger.error('Error clearing test emails:', error);
    return false;
  }
};

module.exports = {
  saveTestEmail,
  previewEmailTemplate,
  listTestEmails,
  clearTestEmails,
  TEST_EMAIL_DIR
}; 