/**
 * Authentication Middleware
 * Provides middleware functions for route authentication and authorization
 */

const passport = require('passport');
const User = require('../models/User');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');
const config = require('../config/environment');
const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate using JWT
 */
const authenticateJWT = passport.authenticate('jwt', { session: false });

/**
 * Rate limiter for authentication routes
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for password reset routes
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 requests per windowMs (increased from 3)
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after an hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Log when rate limit is hit
  handler: (req, res) => {
    logger.warn(`Password reset rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts, please try again after an hour'
    });
  },
  skip: (req) => {
    // Skip rate limiting in development for easier testing
    return config.env === 'development';
  }
});

/**
 * Middleware to handle session timeouts
 */
const sessionTimeout = async (req, res, next) => {
  try {
    // Skip check if no user or auth header
    if (!req.user || !req.headers.authorization) {
      return next();
    }

    const token = req.headers.authorization.split(' ')[1];
    const payload = jwt.verify(token, config.jwtSecret, { ignoreExpiration: true });
    
    // Calculate time since token was issued
    const currentTime = Math.floor(Date.now() / 1000);
    const tokenIssueTime = payload.iat;
    const minutesSinceIssue = Math.floor((currentTime - tokenIssueTime) / 60);
    
    // If token is older than session timeout and not expired yet
    if (minutesSinceIssue >= config.sessionTimeout && currentTime < payload.exp) {
      return res.status(401).json({
        success: false,
        message: 'Session timeout',
        code: 'SESSION_TIMEOUT'
      });
    }
    
    return next();
  } catch (error) {
    logger.error('Error in session timeout middleware:', error);
    return next();
  }
};

/**
 * Middleware to check if user is an admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    logger.error('isAdmin middleware: No user in request');
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  logger.debug(`isAdmin middleware: Checking user role: ${req.user.role}`);
  
  if (req.user.role === 'admin') {
    logger.debug(`Admin access granted for user: ${req.user.email}`);
    return next();
  }
  
  logger.warn(`Admin access denied for user: ${req.user.email} with role: ${req.user.role}`);
  return res.status(403).json({ success: false, message: 'Access denied: Admin role required' });
};

/**
 * Middleware to check if user is a provider
 */
const isProvider = (req, res, next) => {
  if (req.user && req.user.role === 'provider') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Provider role required' });
};

/**
 * Middleware to check if user is a verified provider
 */
const isVerifiedProvider = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    if (req.user.role !== 'provider') {
      return res.status(403).json({ success: false, message: 'Access denied: Provider role required' });
    }
    
    // Check if provider is verified by loading the full user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (!user.providerProfile || !user.providerProfile.isVerified) {
      return res.status(403).json({ 
        success: false, 
        message: 'Your provider account is pending verification. Please wait for admin approval.',
        code: 'PROVIDER_NOT_VERIFIED'
      });
    }
    
    return next();
  } catch (error) {
    logger.error('Error in isVerifiedProvider middleware:', error);
    return res.status(500).json({ success: false, message: 'Server error during verification check' });
  }
};

/**
 * Middleware to check if user is a patient
 */
const isPatient = (req, res, next) => {
  if (req.user && req.user.role === 'patient') {
    return next();
  }
  return res.status(403).json({ 
    success: false, 
    message: 'Access denied. Patient role required.' 
  });
};

/**
 * Middleware to check if user is an admin or provider
 */
const isAdminOrProvider = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'provider')) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Admin or Provider role required' });
};

/**
 * Middleware to check if user is an admin or verified provider
 */
const isAdminOrVerifiedProvider = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    // Admin can access all routes
    if (req.user.role === 'admin') {
      return next();
    }
    
    // For providers, check verification status
    if (req.user.role === 'provider') {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      if (user.providerProfile && user.providerProfile.isVerified) {
        return next();
      }
      
      return res.status(403).json({ 
        success: false, 
        message: 'Your provider account is pending verification. Please wait for admin approval.',
        code: 'PROVIDER_NOT_VERIFIED'
      });
    }
    
    // All other roles denied
    return res.status(403).json({ success: false, message: 'Access denied: Admin or verified provider role required' });
  } catch (error) {
    logger.error('Error in isAdminOrVerifiedProvider middleware:', error);
    return res.status(500).json({ success: false, message: 'Server error during verification check' });
  }
};

/**
 * Middleware to check if user is accessing their own data or has permission
 */
const isOwnProfileOrAdmin = async (req, res, next) => {
  try {
    // User is admin - allow access
    if (req.user.role === 'admin') {
      return next();
    }
    
    // User is accessing their own profile - allow access
    if (req.user._id.toString() === req.params.userId) {
      return next();
    }
    
    // User is provider checking patient data - check connection
    if (req.user.role === 'provider') {
      // If patient ID is provided in params
      if (req.params.patientId) {
        const canAccessPatient = await canProviderAccessPatient(req.user._id, req.params.patientId);
        if (canAccessPatient) {
          return next();
        }
      }
    }
    
    return res.status(403).json({ success: false, message: 'Access denied: Insufficient permissions' });
  } catch (error) {
    logger.error('Error in isOwnProfileOrAdmin middleware:', error);
    return res.status(500).json({ success: false, message: 'Server error during access verification' });
  }
};

/**
 * Helper function to check if provider has access to patient data
 * @param {String} providerId - Provider ID
 * @param {String} patientId - Patient ID
 * @param {Boolean} requireFullAccess - Whether full approved access is required
 * @returns {Promise<Boolean>} - Whether provider has access
 */
const canProviderAccessPatient = async (providerId, patientId, requireFullAccess = false) => {
  try {
    // Import Connection model
    const Connection = require('../models/Connection');
    
    // Find connection between provider and patient
    const connection = await Connection.findOne({
      provider: providerId,
      patient: patientId
    });
    
    if (!connection) {
      return false;
    }
    
    // If full access is required, check that it's approved
    if (requireFullAccess) {
      return connection.accessLevel === 'full' && connection.fullAccessStatus === 'approved';
    }
    
    // Otherwise, any connection is sufficient (for limited access)
    return true;
  } catch (error) {
    logger.error('Error checking provider-patient connection:', error);
    return false;
  }
};

module.exports = {
  authenticateJWT,
  authRateLimiter,
  passwordResetLimiter,
  sessionTimeout,
  isAdmin,
  isProvider,
  isVerifiedProvider,
  isPatient,
  isAdminOrProvider,
  isAdminOrVerifiedProvider,
  isOwnProfileOrAdmin
}; 