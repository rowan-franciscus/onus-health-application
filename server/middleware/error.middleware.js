/**
 * Error Handling Middleware
 * Provides centralized error handling for the application
 */

const logger = require('../utils/logger');
const config = require('../config/environment');

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle 404 errors
 */
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Resource not found - ${req.originalUrl}`);
  next(error);
};

/**
 * Central error handler
 */
const errorHandler = (err, req, res, next) => {
  // Default to 500 if status code not set
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error
  if (statusCode >= 500) {
    logger.error({
      message: `${statusCode} - ${message}`,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      stack: err.stack
    });
  } else {
    logger.warn({
      message: `${statusCode} - ${message}`,
      url: req.originalUrl,
      method: req.method
    });
  }
  
  // Create response
  const response = {
    success: false,
    message
  };
  
  // In development, include the error stack
  if (config.env === 'development') {
    response.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
};

/**
 * Handle uncaught exceptions and unhandled rejections
 */
const setupErrorHandling = () => {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('UNCAUGHT EXCEPTION:', error);
    
    // Exit with failure
    process.exit(1);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('UNHANDLED REJECTION:', reason);
    
    // Exit with failure
    process.exit(1);
  });
};

module.exports = {
  ApiError,
  notFound,
  errorHandler,
  setupErrorHandling
}; 