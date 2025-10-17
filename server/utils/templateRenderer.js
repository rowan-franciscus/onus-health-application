/**
 * Email Template Renderer
 * Handles compiling and rendering of HTML email templates using Handlebars
 */

const fs = require('fs-extra');
const path = require('path');
const handlebars = require('handlebars');
const logger = require('./logger');
const config = require('../config/environment');

// Cache for compiled templates
const templateCache = {};

/**
 * Compile a template and cache it
 * @param {string} templateName - Name of the template file (without extension)
 * @returns {Function|null} Compiled template function
 */
const compileTemplate = async (templateName) => {
  try {
    // Return cached template if available
    if (templateCache[templateName]) {
      return templateCache[templateName];
    }
    
    // Load template content
    const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
    const templateContent = await fs.readFile(templatePath, 'utf8');
    
    // Compile template
    const compiledTemplate = handlebars.compile(templateContent);
    
    // Cache template
    templateCache[templateName] = compiledTemplate;
    
    return compiledTemplate;
  } catch (error) {
    logger.error(`Error compiling template ${templateName}:`, error);
    return null;
  }
};

/**
 * Render a template with provided data
 * @param {string} templateName - Name of the template file (without extension)
 * @param {Object} data - Data to render in the template
 * @returns {string|null} Rendered HTML content
 */
const renderTemplate = async (templateName, data = {}) => {
  try {
    // Compile the template
    const compiledTemplate = await compileTemplate(templateName);
    
    if (!compiledTemplate) {
      throw new Error(`Failed to compile template: ${templateName}`);
    }
    
    // Add common data
    const templateData = {
      ...data,
      logoUrl: data.logoUrl || `${config.frontendUrl}/logo-white.png`,
      year: new Date().getFullYear()
    };
    
    // Render the template content
    const renderedContent = compiledTemplate(templateData);
    
    // Compile the base template
    const baseTemplate = await compileTemplate('baseTemplate');
    
    if (!baseTemplate) {
      throw new Error('Failed to compile base template');
    }
    
    // Render with the base template
    return baseTemplate({
      title: data.title || 'Onus Health',
      body: renderedContent,
      logoUrl: templateData.logoUrl,
      year: templateData.year
    });
  } catch (error) {
    logger.error(`Error rendering template ${templateName}:`, error);
    return null;
  }
};

/**
 * Get a plain text version of the email (simplified)
 * @param {string} html - HTML content
 * @returns {string} Plain text content
 */
const getPlainTextFromHtml = (html) => {
  if (!html) return '';
  
  // Very basic conversion - in a production app, use a proper HTML-to-text library
  return html
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
};

module.exports = {
  renderTemplate,
  getPlainTextFromHtml
}; 