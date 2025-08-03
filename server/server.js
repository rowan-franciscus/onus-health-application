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

// Basic environment validation for production
if (config.env === 'production') {
  const requiredEnvVars = ['MONGODB_ATLAS_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars.join(', '));
    console.error('Please set these variables in your Render dashboard');
    // Don't exit in production, just log the warning
  }
}
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

// CORS configuration - simplified and robust
let corsOptions;

if (config.env === 'development') {
  // More permissive CORS settings in development for debugging
  corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false,
    optionsSuccessStatus: 200
  };
  logger.info('Development mode: CORS configured to allow all origins');
} else {
  // Production CORS with specific allowed origins
  const allowedOrigins = [
    config.frontendUrl,
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ].filter(Boolean); // Remove any undefined values

  corsOptions = {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false,
    optionsSuccessStatus: 200
  };
  logger.info(`CORS configured for origins: ${allowedOrigins.join(', ')}`);
}

app.use(cors(corsOptions));

// Add CORS headers specifically for file routes before other middleware
app.use('/api/files', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

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

// Security middleware with proper configuration for images
// Skip helmet entirely for file routes to avoid CORS issues
app.use((req, res, next) => {
  // Skip helmet for all file routes
  if (req.path.startsWith('/api/files/')) {
    return next();
  }
  
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images to be loaded cross-origin
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:", "*"], // Allow images from any source
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", config.frontendUrl, "http://localhost:3000", "http://localhost:5001"]
      }
    }
  })(req, res, next);
});

// Logging middleware
app.use(morgan('dev', { stream: logger.stream }));

// Authentication middleware
app.use(passport.initialize());

// Session timeout middleware
app.use(sessionTimeout);

// Static files with CORS headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Health check endpoint (before auth middleware)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: config.env,
    frontendUrl: config.frontendUrl
  });
});

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