/**
 * Environment Configuration Module
 * Centralizes environment variable configuration based on NODE_ENV
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

// Helper for MongoDB Atlas URI format
const getMongoUri = () => {
  // Check if MongoDB Atlas URI is provided
  if (process.env.MONGODB_ATLAS_URI) {
    let uri = process.env.MONGODB_ATLAS_URI;
    
    // Make sure the connection string includes the database name
    if (uri.includes('mongodb+srv://') || uri.includes('mongodb://')) {
      if (!uri.includes('/onus-health?') && uri.includes('/?')) {
        uri = uri.replace('/?', '/onus-health?');
      } else if (!uri.includes('/onus-health')) {
        // If no database specified and no query params
        if (uri.includes('?')) {
          uri = uri.replace('?', '/onus-health?');
        } else {
          uri = uri + '/onus-health';
        }
      }
    }
    
    // Ensure readPreference=primary for transactions to work properly
    if (!uri.includes('readPreference=')) {
      const separator = uri.includes('?') ? '&' : '?';
      uri = uri + separator + 'readPreference=primary';
    }
    
    return uri;
  }

  // Check if individual MongoDB Atlas credentials are provided
  const username = process.env.MONGODB_ATLAS_USERNAME;
  const password = process.env.MONGODB_ATLAS_PASSWORD;
  const cluster = process.env.MONGODB_ATLAS_CLUSTER;

  if (username && password && cluster) {
    return `mongodb+srv://${username}:${password}@${cluster}.mongodb.net/onus-health?retryWrites=true&w=majority&readPreference=primary`;
  }

  // Fall back to local MongoDB URI
  return process.env.MONGO_URI || 'mongodb://localhost:27017/onus-health';
};

// Default configuration values
const defaultConfig = {
  port: 5001,
  mongoUri: 'mongodb://localhost:27017/onus-health',
  jwtSecret: require('crypto').randomBytes(64).toString('hex'),
  jwtExpiresIn: '7d',
  jwtRefreshSecret: require('crypto').randomBytes(64).toString('hex'),
  jwtRefreshExpiresIn: '30d',
  frontendUrl: 'http://localhost:3000',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  logLevel: 'info',
  mailProvider: 'sendgrid', // 'sendgrid' or 'nodemailer'
  logoUrl: 'https://onushealth.com/logo.png', // Default logo URL
  emailQueueSettings: {
    processInterval: 60000, // Process email queue every 60 seconds
    retryIntervals: [5, 15, 60], // Retry intervals in minutes
    maxAttempts: 3
  }
};

// Environment specific configurations
const environments = {
  development: {
    port: process.env.PORT || defaultConfig.port,
    mongoUri: getMongoUri(),
    jwtSecret: process.env.JWT_SECRET || defaultConfig.jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || defaultConfig.jwtExpiresIn,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || defaultConfig.jwtRefreshSecret,
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || defaultConfig.jwtRefreshExpiresIn,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL,
    facebookAppId: process.env.FACEBOOK_APP_ID,
    facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
    facebookCallbackUrl: process.env.FACEBOOK_CALLBACK_URL,
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    emailFrom: process.env.EMAIL_FROM || 'noreply@onushealth.com',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@onus.health',
    supportPhone: process.env.SUPPORT_PHONE || '081 000 0000',
    frontendUrl: process.env.FRONTEND_URL || defaultConfig.frontendUrl,
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || defaultConfig.maxFileSize),
    logLevel: 'debug',
    mongoDbName: 'onus-health',
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || 30), // Session timeout in minutes
    
    // Email settings
    mailProvider: process.env.MAIL_PROVIDER || defaultConfig.mailProvider,
    logoUrl: process.env.LOGO_URL || defaultConfig.logoUrl,
    
    // SMTP settings for nodemailer fallback
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    },
    
    // For testing
    testMode: process.env.TEST_MODE === 'true',
    
    // Email queue settings
    emailQueueSettings: {
      processInterval: parseInt(process.env.QUEUE_PROCESS_INTERVAL || defaultConfig.emailQueueSettings.processInterval),
      retryIntervals: process.env.RETRY_INTERVALS ? 
        process.env.RETRY_INTERVALS.split(',').map(n => parseInt(n)) : 
        defaultConfig.emailQueueSettings.retryIntervals,
      maxAttempts: parseInt(process.env.MAX_ATTEMPTS || defaultConfig.emailQueueSettings.maxAttempts)
    }
  },
  test: {
    port: process.env.PORT || defaultConfig.port,
    mongoUri: getMongoUri(),
    jwtSecret: 'test_jwt_secret',
    jwtExpiresIn: '1h',
    jwtRefreshSecret: 'test_jwt_refresh_secret',
    jwtRefreshExpiresIn: '24h',
    frontendUrl: process.env.FRONTEND_URL || defaultConfig.frontendUrl,
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || defaultConfig.maxFileSize),
    logLevel: 'debug',
    mongoDbName: 'onus-health'
  },
  production: {
    port: process.env.PORT || defaultConfig.port,
    mongoUri: getMongoUri(),
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL,
    facebookAppId: process.env.FACEBOOK_APP_ID,
    facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
    facebookCallbackUrl: process.env.FACEBOOK_CALLBACK_URL,
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    emailFrom: process.env.EMAIL_FROM,
    supportEmail: process.env.SUPPORT_EMAIL || 'support@onus.health',
    supportPhone: process.env.SUPPORT_PHONE || '081 000 0000',
    frontendUrl: process.env.FRONTEND_URL,
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || defaultConfig.maxFileSize),
    logLevel: 'warn',
    mongoDbName: 'onus-health',
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || 30) // Session timeout in minutes
  }
};

// Get current environment from NODE_ENV or default to development
const currentEnv = process.env.NODE_ENV || 'development';

// Validate that we have a valid environment configuration
if (!environments[currentEnv]) {
  console.warn(`Invalid NODE_ENV "${currentEnv}", falling back to development configuration`);
}

// Export the configuration for the current environment with defaults for missing values
const config = {
  env: currentEnv,
  ...defaultConfig,
  ...environments[currentEnv] || environments.development
};

// Security check: Warn about using default JWT secrets in production
if (config.env === 'production') {
  if (!process.env.JWT_SECRET) {
    console.error('WARNING: Using default JWT secret in production! This is a security risk.');
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    console.error('WARNING: Using default JWT refresh secret in production! This is a security risk.');
  }
}

module.exports = config; 