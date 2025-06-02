/**
 * Main server entry point for Express backend
 * Configures the Express application and starts the server
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import custom configuration
const config = require('./config/environment');
const logger = require('./utils/logger');
const database = require('./utils/database');
const connectionMonitor = require('./utils/connectionMonitor');
const passport = require('./config/passport');
const { notFound, errorHandler, setupErrorHandling } = require('./middleware/error.middleware');
const { handleUploadErrors } = require('./middleware/upload.middleware');
const { sessionTimeout } = require('./middleware/auth.middleware');
const emailService = require('./services/email.service');

// Setup global error handling for uncaught exceptions
setupErrorHandling();

// Initialize Express app
const app = express();

// Disable ETag headers (avoid 304 with empty body for frontend API calls)
app.disable('etag');

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use more permissive CORS settings in development for debugging
if (config.env === 'development') {
  app.use(cors({
    origin: '*', // Allow any origin in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    optionsSuccessStatus: 200
  }));
  logger.info('Development mode: CORS configured to allow all origins');
} else {
  app.use(cors({
    origin: config.frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    optionsSuccessStatus: 200
  }));
  logger.info(`CORS configured with origin: ${config.frontendUrl}`);
}

logger.info(`Frontend URL configured as: ${config.frontendUrl}`);
logger.info(`Current environment: ${config.env}`);

// For debugging - log API requests in non-production
if (config.env !== 'production') {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.url}`);
    
    // Log authorization header (but hide the token value)
    if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      logger.debug(`Authorization: ${authHeader.startsWith('Bearer') ? 'Bearer [TOKEN]' : authHeader}`);
    } else {
      logger.debug('No Authorization header present');
    }
    
    // Log request body for non-GET requests (but hide passwords)
    if (req.method !== 'GET' && req.body) {
      const sanitizedBody = { ...req.body };
      if (sanitizedBody.password) sanitizedBody.password = '[HIDDEN]';
      logger.debug(`Request body: ${JSON.stringify(sanitizedBody)}`);
    }
    
    next();
  });
}

// Security middleware
app.use(helmet());

// Logging middleware
app.use(morgan('dev', { stream: logger.stream }));

// Authentication middleware
app.use(passport.initialize());

// Session timeout middleware
app.use(sessionTimeout);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);

// Add connection status endpoint
app.get('/api/status/db', (req, res) => {
  res.json(connectionMonitor.getMetrics());
});

// Handle 404 errors
app.use(notFound);

// Handle file upload errors
app.use(handleUploadErrors);

// Global error handler
app.use(errorHandler);

// Start server function
const startServer = async () => {
  try {
    // Connect to the database
    await database.connect();
    
    // Start connection monitoring
    connectionMonitor.startMonitoring();

    // Automatically check and fix test authentication in development mode
    if (config.env === 'development') {
      const User = require('./models/User');
      try {
        const result = await User.checkAndFixTestAuthentication();
        if (result.fixed > 0) {
          logger.info(`Fixed authentication for ${result.fixed} test accounts`);
        }
      } catch (error) {
        logger.warn('Could not auto-fix test accounts:', error.message);
      }
    }

    // Start the email queue processor
    if (!config.testMode) {
      emailService.startEmailQueueProcessor();
      logger.info('Email queue processor started');
    }

    // Start the HTTP server
    const PORT = config.port;
    app.listen(PORT, () => {
      logger.info(`Server running in ${config.env} mode on port ${PORT}`);
      logger.info(`API available at http://localhost:${PORT}/api`);
      
      // Ping the database to verify connection
      connectionMonitor.pingDatabase().then(pingTime => {
        if (pingTime >= 0) {
          logger.info(`Database ping successful: ${pingTime}ms`);
        }
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// For testing
module.exports = app; 