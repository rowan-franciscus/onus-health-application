/**
 * Validation Middleware
 * Provides request data validation utilities
 */

const { ApiError } = require('./error.middleware');
const { validationResult } = require('express-validator');

/**
 * Process validation results from express-validator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * Validate required fields in request body
 * @param {Array<string>} fields - Array of required field names
 * @returns {Function} Middleware function
 */
const validateRequiredFields = (fields) => {
  return (req, res, next) => {
    const missingFields = fields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return next(
        new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`)
      );
    }
    
    next();
  };
};

/**
 * Validate email format
 * @param {string} fieldName - Name of the field containing email
 * @returns {Function} Middleware function
 */
const validateEmail = (fieldName = 'email') => {
  return (req, res, next) => {
    const email = req.body[fieldName];
    
    if (!email) {
      return next();
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(
        new ApiError(400, 'Invalid email format')
      );
    }
    
    next();
  };
};

/**
 * Validate password strength
 * @param {string} fieldName - Name of the field containing password
 * @returns {Function} Middleware function
 */
const validatePassword = (fieldName = 'password') => {
  return (req, res, next) => {
    const password = req.body[fieldName];
    
    if (!password) {
      return next();
    }
    
    if (password.length < 8) {
      return next(
        new ApiError(400, 'Password must be at least 8 characters long')
      );
    }
    
    // Check for at least one number and one special character
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])/;
    if (!passwordRegex.test(password)) {
      return next(
        new ApiError(400, 'Password must contain at least one number and one special character')
      );
    }
    
    next();
  };
};

/**
 * Validate MongoDB ObjectId format
 * @param {Array<string>} paramNames - Array of param names to validate as ObjectIds
 * @returns {Function} Middleware function
 */
const validateObjectId = (paramNames) => {
  return (req, res, next) => {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    
    const invalidParams = paramNames.filter(param => {
      const id = req.params[param];
      return id && !objectIdRegex.test(id);
    });
    
    if (invalidParams.length > 0) {
      return next(
        new ApiError(400, `Invalid ID format for: ${invalidParams.join(', ')}`)
      );
    }
    
    next();
  };
};

module.exports = {
  validateRequest,
  validateRequiredFields,
  validateEmail,
  validatePassword,
  validateObjectId
}; 