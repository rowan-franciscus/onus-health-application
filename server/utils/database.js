/**
 * MongoDB Connection Utility
 * 
 * Provides a robust connection to MongoDB with:
 * - Connection pooling
 * - Automatic reconnection
 * - Connection monitoring
 * - Graceful shutdown handling
 */

const mongoose = require('mongoose');
const config = require('../config/environment');
const logger = require('./logger');

// Keep track of retry attempts
let retryCount = 0;
const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 5000;

// Initialize the connection state
let connectionState = {
  isConnected: false,
  isConnecting: false,
  lastError: null,
  lastConnectionTime: null,
  connectionAttempts: 0
};

/**
 * Get the current connection state
 * @returns {Object} Connection state object
 */
const getConnectionState = () => {
  return {
    ...connectionState,
    readyState: mongoose.connection.readyState
  };
};

/**
 * Configure MongoDB connection options based on environment
 * @returns {Object} Mongoose connection options
 */
const getConnectionOptions = () => {
  // Common options for all environments
  const options = {
    autoIndex: config.env !== 'production', // Disable automatic indexing in production for performance
    maxPoolSize: 10, // Maximum number of connections in the pool
    minPoolSize: 2,  // Minimum number of connections in the pool
    socketTimeoutMS: 45000, // How long sockets to commands can remain idle before timeout
    serverSelectionTimeoutMS: 30000, // How long to wait for server selection
    heartbeatFrequencyMS: 10000, // Frequency of heartbeats
  };

  // Environment-specific options
  if (config.env === 'production') {
    // Production-specific options
    return {
      ...options,
      maxPoolSize: 50, // More connections for production
      minPoolSize: 5,
      writeConcern: {
        w: 'majority',
        j: true,
        wtimeout: 10000
      },
      // readPreference is set in connection string to 'primary' for transactions
    };
  }

  // Default to development options
  return options;
};

/**
 * Setup event listeners for MongoDB connection
 */
const setupConnectionListeners = () => {
  // Connection successful
  mongoose.connection.on('connected', () => {
    connectionState = {
      ...connectionState,
      isConnected: true,
      isConnecting: false,
      lastError: null,
      lastConnectionTime: new Date(),
    };
    retryCount = 0; // Reset retry counter on successful connection
    logger.info('MongoDB connection established to onus-health database');
  });

  // Connection failed
  mongoose.connection.on('error', (err) => {
    connectionState = {
      ...connectionState,
      isConnected: false,
      lastError: err,
    };
    logger.error('MongoDB connection error:', err);
  });

  // Connection disconnected
  mongoose.connection.on('disconnected', () => {
    connectionState.isConnected = false;
    logger.warn('MongoDB connection disconnected');
    
    // Try to reconnect if not in the process of connecting or shutting down
    if (!connectionState.isConnecting && !global.isShuttingDown) {
      attemptReconnect();
    }
  });

  // When Node process ends, close the Mongoose connection
  setupGracefulShutdown();
};

/**
 * Attempt to reconnect to MongoDB with retry logic
 */
const attemptReconnect = async () => {
  if (connectionState.isConnecting || global.isShuttingDown) return;

  if (retryCount >= MAX_RETRIES) {
    logger.error(`Failed to reconnect to MongoDB after ${MAX_RETRIES} attempts. Exiting.`);
    process.exit(1);
    return;
  }

  connectionState.isConnecting = true;
  retryCount++;
  
  const backoff = RETRY_INTERVAL_MS * Math.pow(1.5, retryCount - 1);
  logger.info(`Attempting to reconnect to MongoDB in ${backoff / 1000}s... (Attempt ${retryCount}/${MAX_RETRIES})`);

  setTimeout(async () => {
    try {
      await connect();
    } catch (error) {
      connectionState.isConnecting = false;
      logger.error('Reconnection attempt failed:', error);
      // Next retry will be handled by the disconnected event
    }
  }, backoff);
};

/**
 * Setup graceful shutdown to properly close database connections
 */
const setupGracefulShutdown = () => {
  const shutdown = async (signal) => {
    global.isShuttingDown = true;
    logger.info(`${signal} received: closing MongoDB connection`);
    
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed successfully');
      process.exit(0);
    } catch (err) {
      logger.error('Error during MongoDB connection close:', err);
      process.exit(1);
    }
  };

  // Listen for termination signals
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

/**
 * Connect to MongoDB with configured options
 * @returns {Promise<mongoose.Connection>} MongoDB connection
 */
const connect = async () => {
  if (mongoose.connection.readyState === 1) {
    logger.debug('MongoDB already connected to onus-health database');
    return mongoose.connection;
  }

  connectionState.isConnecting = true;
  connectionState.connectionAttempts++;

  try {
    logger.info(`Connecting to MongoDB (${config.env} environment): ${config.mongoUri.split('@').pop()}`);
    const options = getConnectionOptions();

    // Connect to MongoDB
    await mongoose.connect(config.mongoUri, options);
    
    // Verify database name
    const db = mongoose.connection.db;
    const dbInfo = await db.admin().listDatabases();
    const dbName = mongoose.connection.name;
    
    if (dbName !== 'onus-health') {
      logger.warn(`Connected to database "${dbName}" instead of "onus-health". Please check your connection string.`);
    } else {
      logger.info(`Connected to database: ${dbName}`);
    }
    
    connectionState.isConnecting = false;
    return mongoose.connection;
  } catch (err) {
    connectionState.isConnecting = false;
    connectionState.lastError = err;
    logger.error('Error connecting to MongoDB:', err);
    
    // In test environment, we want to fail fast
    if (config.env === 'test') {
      throw err;
    }
    
    // Otherwise, attempt reconnection with exponential backoff
    attemptReconnect();
    throw err;
  }
};

/**
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */
const disconnect = async () => {
  if (mongoose.connection.readyState !== 0) {
    logger.info('Disconnecting from MongoDB');
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  }
};

// Set up connection listeners
setupConnectionListeners();

module.exports = {
  connect,
  disconnect,
  getConnectionState,
  getConnectionOptions,
  connection: mongoose.connection
}; 