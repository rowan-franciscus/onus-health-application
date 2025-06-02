/**
 * MongoDB Connection Monitor
 * 
 * Monitors the MongoDB connection for health and performance
 * Provides connection metrics and health status information
 */

const mongoose = require('mongoose');
const config = require('../config/environment');
const logger = require('./logger');
const database = require('./database');

// Connection metrics object
let metrics = {
  connectedSince: null,
  disconnectionCount: 0,
  reconnectionCount: 0,
  lastPingTime: null,
  averagePingTime: 0,
  pingCount: 0,
  totalPingTime: 0,
  status: 'disconnected',
  failedOperations: 0,
  successfulOperations: 0
};

// Track ongoing operations
let operationsCounter = 0;

/**
 * Get the current MongoDB connection status
 * @returns {string} Connection status description
 */
const getConnectionStatus = () => {
  const readyState = mongoose.connection.readyState;
  
  switch (readyState) {
    case 0:
      return 'disconnected';
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'unknown';
  }
};

/**
 * Get the current connection metrics
 * @returns {Object} Current connection metrics
 */
const getMetrics = () => {
  const currentStatus = getConnectionStatus();
  return {
    ...metrics,
    status: currentStatus,
    currentOperations: operationsCounter,
    readyState: mongoose.connection.readyState,
    connectionState: database.getConnectionState()
  };
};

/**
 * Ping the database to check connection health
 * @returns {Promise<number>} Ping time in ms
 */
const pingDatabase = async () => {
  if (mongoose.connection.readyState !== 1) {
    return -1; // Not connected
  }
  
  try {
    const startTime = Date.now();
    
    // Ping the database with a simple command
    await mongoose.connection.db.admin().ping();
    
    const pingTime = Date.now() - startTime;
    
    // Update metrics
    metrics.lastPingTime = pingTime;
    metrics.pingCount++;
    metrics.totalPingTime += pingTime;
    metrics.averagePingTime = metrics.totalPingTime / metrics.pingCount;
    
    return pingTime;
  } catch (error) {
    logger.error('Failed to ping MongoDB:', error);
    return -1;
  }
};

/**
 * Start monitoring the MongoDB connection health
 * @param {number} interval - Monitoring interval in ms 
 */
const startMonitoring = (interval = 30000) => {
  if (config.env === 'test') {
    return; // Skip monitoring in test environment
  }
  
  logger.info(`Starting MongoDB connection monitoring with interval: ${interval}ms`);
  
  // Monitor connection state events
  mongoose.connection.on('connected', () => {
    metrics.connectedSince = new Date();
    metrics.status = 'connected';
    logger.info('MongoDB connection established. Monitoring active.');
    
    // Perform initial ping
    pingDatabase().then(pingTime => {
      if (pingTime >= 0) {
        logger.info(`Initial database ping successful: ${pingTime}ms`);
      }
    });
  });
  
  mongoose.connection.on('disconnected', () => {
    metrics.disconnectionCount++;
    metrics.status = 'disconnected';
    metrics.connectedSince = null;
    logger.warn('MongoDB disconnected. Connection monitoring continues.');
  });
  
  mongoose.connection.on('reconnected', () => {
    metrics.reconnectionCount++;
    metrics.connectedSince = new Date();
    metrics.status = 'connected';
    logger.info('MongoDB reconnected. Monitoring continues.');
  });
  
  // Set up regular ping interval
  const monitoringInterval = setInterval(async () => {
    if (mongoose.connection.readyState === 1) {
      const pingTime = await pingDatabase();
      
      if (pingTime >= 0) {
        // Log ping time if it's significantly high
        if (pingTime > 500) {
          logger.warn(`High MongoDB ping time: ${pingTime}ms`);
        }
      } else {
        logger.error('Failed to ping MongoDB database');
      }
    }
  }, interval);
  
  // Ensure interval is cleared on process exit
  process.on('SIGINT', () => clearInterval(monitoringInterval));
  process.on('SIGTERM', () => clearInterval(monitoringInterval));
  
  return monitoringInterval;
};

/**
 * Track the start of a database operation
 */
const trackOperationStart = () => {
  operationsCounter++;
};

/**
 * Track the end of a database operation
 * @param {boolean} success - Whether the operation succeeded
 */
const trackOperationEnd = (success = true) => {
  operationsCounter = Math.max(0, operationsCounter - 1);
  
  if (success) {
    metrics.successfulOperations++;
  } else {
    metrics.failedOperations++;
  }
};

module.exports = {
  getMetrics,
  pingDatabase,
  startMonitoring,
  getConnectionStatus,
  trackOperationStart,
  trackOperationEnd
}; 