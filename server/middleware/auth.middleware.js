/**
 * Authentication Middleware
 * Provides middleware functions for route authentication and authorization
 */

const passport = require('passport');
const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');
const config = require('../config/environment');
const jwt = require('jsonwebtoken');
const auditService = require('../services/audit.service');
const requestContext = require('../utils/requestContext');

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
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    // Closest equivalent to an account-lockout event in this system
    auditService.logFromRequest(req, {
      type: 'auth',
      subtype: 'rate-limit-lockout',
      action: 'E',
      outcome: '8',
      outcomeDesc: 'too-many-login-attempts'
    });
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again after 15 minutes'
    });
  }
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
    auditService.logFromRequest(req, {
      type: 'auth',
      subtype: 'rate-limit-lockout',
      action: 'E',
      outcome: '8',
      outcomeDesc: 'too-many-password-reset-attempts'
    });
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
 * Rate limiter for the public consent and claim links. Each link also has its
 * own DOB attempt limit; this caps guessing across many links from one IP.
 */
const consentLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Consent link rate limit exceeded for IP: ${req.ip}`);
    auditService.logFromRequest(req, {
      type: 'security',
      subtype: 'rate-limit-lockout',
      action: 'E',
      outcome: '8',
      outcomeDesc: 'too-many-consent-link-attempts'
    });
    res.status(429).json({
      success: false,
      message: 'Too many attempts, please try again after 15 minutes'
    });
  },
  skip: () => config.env === 'development' || config.env === 'test'
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
      // Attribute the session expiry from the verified token payload: this
      // middleware is mounted globally, ahead of the per-route passport
      // authentication that populates req.user.
      // NOTE: the guard above only proceeds when req.user is already set, so
      // in the current mounting order this branch is inert and the timeout is
      // enforced on the refresh path instead (authController.refreshToken,
      // which emits the same session-timeout event). Making it active here
      // would turn the activity-based session into an absolute 30-minute one
      // and log out users mid-session — a separate decision from auditing.
      const store = requestContext.getStore();
      if (store) {
        store.audit.handled = true;
      }
      auditService.log({
        type: 'auth',
        subtype: 'session-timeout',
        action: 'E',
        outcome: '8',
        outcomeDesc: 'session-timeout',
        agent: {
          userId: payload.id || null,
          role: payload.role,
          ip: req.ip,
          userAgent: req.get('user-agent')
        },
        // Path only — never the query string (the file route accepts ?token=)
        context: { method: req.method, path: requestContext.pathOf(req) }
      });
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
 * Middleware to check if user is an active practice admin.
 * Also rejects users whose practiceAdminProfile.status is not 'active'.
 */
const isPracticeAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'practice_admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Practice Admin role required' });
    }

    const user = await User.findById(req.user.id).select('practiceAdminProfile');
    if (!user || !user.practiceAdminProfile || user.practiceAdminProfile.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Practice Admin account is not active',
        code: 'PRACTICE_ADMIN_INACTIVE'
      });
    }

    if (!user.practiceAdminProfile.practiceId) {
      return res.status(403).json({ success: false, message: 'Practice Admin has no practice assigned' });
    }

    req.practiceId = user.practiceAdminProfile.practiceId;
    return next();
  } catch (error) {
    logger.error('Error in isPracticeAdmin middleware:', error);
    return res.status(500).json({ success: false, message: 'Server error during practice-admin check' });
  }
};

/**
 * Middleware allowing either a verified provider or an active practice admin.
 */
const isProviderOrPracticeAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (req.user.role === 'provider') {
    return isProvider(req, res, next);
  }
  if (req.user.role === 'practice_admin') {
    return isPracticeAdmin(req, res, next);
  }
  return res.status(403).json({ success: false, message: 'Access denied: Provider or Practice Admin role required' });
};

/**
 * Helper: can this practice admin access this patient?
 * Patient must be connected to any provider in the practice admin's practice.
 */
const canPracticeAdminAccessPatient = async (practiceAdminUserId, patientId) => {
  try {
    const Practice = require('../models/Practice');
    const Connection = require('../models/Connection');

    const adminUser = await User.findById(practiceAdminUserId).select('practiceAdminProfile');
    if (!adminUser || !adminUser.practiceAdminProfile || !adminUser.practiceAdminProfile.practiceId) {
      return false;
    }
    if (adminUser.practiceAdminProfile.status !== 'active') {
      return false;
    }

    const practice = await Practice.findById(adminUser.practiceAdminProfile.practiceId).select('members owner');
    if (!practice) return false;

    const providerIds = [practice.owner, ...(practice.members || [])];
    const exists = await Connection.exists({
      patient: patientId,
      provider: { $in: providerIds }
    });
    return !!exists;
  } catch (error) {
    logger.error('Error in canPracticeAdminAccessPatient:', error);
    return false;
  }
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
 * The provider's connection to a patient, only if the patient's consent is
 * ACTIVE: pending, declined, expired and withdrawn consents all deny. Use it
 * (or requireActiveConsent) for "may this provider act on this patient's
 * clinical data" checks.
 * @param {String} providerId - Provider ID
 * @param {String} patientId - Patient ID
 * @param {Object} [options]
 * @param {Boolean} [options.requireFullAccess] - Also require approved full access
 * @returns {Promise<Object|null>} The Connection, or null
 */
const getActiveConnection = async (providerId, patientId, { requireFullAccess = false } = {}) => {
  const Connection = require('../models/Connection');
  const query = { provider: providerId, patient: patientId, 'consent.status': 'ACTIVE' };
  if (requireFullAccess) {
    query.accessLevel = 'full';
    query.fullAccessStatus = 'approved';
  }
  return Connection.findOne(query);
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
    return Boolean(await getActiveConnection(providerId, patientId, { requireFullAccess }));
  } catch (error) {
    logger.error('Error checking provider-patient connection:', error);
    return false;
  }
};

/**
 * Patients whose consent to this provider is ACTIVE. Provider list endpoints
 * only return records for these patients (an allowlist, so a deleted or
 * missing connection never re-exposes records the provider created earlier).
 */
const activePatientIds = async (providerId) => {
  const Connection = require('../models/Connection');
  const active = await Connection.find({
    provider: providerId,
    'consent.status': 'ACTIVE'
  }).select('patient').lean();
  return active.map((c) => c.patient);
};

/**
 * 403 for a provider acting on a patient whose consent isn't ACTIVE.
 */
const sendConsentRequired = (res) =>
  res.status(403).json({
    success: false,
    code: 'CONSENT_REQUIRED',
    message: 'The patient has not given consent, so this action is not available'
  });

/**
 * Mongo filter for consultations written by `providerIds` whose patient's
 * consent to that same provider is ACTIVE (optionally for one patient). Used
 * by billing and overview pages, which list consultations across providers.
 */
const consentedConsultationFilter = async (providerIds, patientId) => {
  const Connection = require('../models/Connection');
  const query = { provider: { $in: providerIds }, 'consent.status': 'ACTIVE' };
  if (patientId) query.patient = patientId;
  const active = await Connection.find(query).select('provider patient').lean();
  if (active.length === 0) {
    return { _id: { $in: [] } };
  }
  return { $or: active.map((c) => ({ provider: c.provider, patient: c.patient })) };
};

// ---- Patient-consent guard ----
// Resolvers map a request to the patient it acts on. They return null when
// the target can't be resolved (bad ID, not found) so the route's own
// validation/404 handling still applies.

const asObjectId = (value) => (mongoose.isValidObjectId(value) ? value : null);

const patientFromParam = (name) => async (req) => asObjectId(req.params[name]);

const patientFromBody = (...names) => async (req) => {
  for (const name of names) {
    const value = req.body && req.body[name];
    if (value) return asObjectId(value._id ? value._id : value);
  }
  return null;
};

// Looks up `Model` by the ID in req.params[param] and returns its patient
const patientFromDocument = (modelName, param, field = 'patient') => async (req) => {
  const id = asObjectId(req.params[param]);
  if (!id) return null;
  const doc = await mongoose.model(modelName).findById(id).select(field).lean();
  return doc ? doc[field] : null;
};

// POST /consultations accepts a patient ID or a patient email (real accounts only)
const patientFromConsultationBody = async (req) => {
  const byId = await patientFromBody('patient', 'patientId')(req);
  if (byId) return byId;
  const email = req.body && req.body.patientEmail;
  if (!email) return null;
  const patient = await User.findOne({
    email: String(email).trim().toLowerCase(),
    role: 'patient',
    isOnusUser: { $ne: false }
  }).select('_id').lean();
  return patient ? patient._id : null;
};

const providerIdsForPracticeAdmin = async (userId) => {
  const Practice = require('../models/Practice');
  const adminUser = await User.findById(userId).select('practiceAdminProfile');
  const practiceId = adminUser && adminUser.practiceAdminProfile && adminUser.practiceAdminProfile.practiceId;
  if (!practiceId) return [];
  const practice = await Practice.findById(practiceId).select('owner members');
  return practice ? [practice.owner, ...(practice.members || [])] : [];
};

/**
 * Route guard: providers (and practice admins, through any provider in their
 * practice) may only act on a patient whose consent is ACTIVE. Patients and
 * platform admins pass through to the route's existing checks.
 *
 * Responds 403 { code: 'CONSENT_REQUIRED', consentStatus } when a connection
 * exists but consent isn't active, and 403 when there is no connection at all
 * (unless allowMissingConnection, for routes that create path-1 connections to
 * real patient accounts).
 */
const requireActiveConsent = (resolvePatientId, { allowMissingConnection = false } = {}) =>
  async (req, res, next) => {
    try {
      const role = req.user && req.user.role;
      if (role !== 'provider' && role !== 'practice_admin') {
        return next();
      }

      const patientId = await resolvePatientId(req);
      if (!patientId) {
        return next();
      }

      const Connection = require('../models/Connection');
      const providerFilter = role === 'provider'
        ? req.user._id || req.user.id
        : { $in: await providerIdsForPracticeAdmin(req.user._id || req.user.id) };

      const connections = await Connection.find({ provider: providerFilter, patient: patientId })
        .select('_id accessLevel consent.status');
      const active = connections.find((c) => c.consent && c.consent.status === 'ACTIVE');

      if (active) {
        if (req.audit) {
          req.audit.set({ connectionId: active._id, accessLevel: active.accessLevel });
        }
        return next();
      }

      if (connections.length === 0) {
        // Only real patient accounts can be auto-connected; provider-created
        // placeholders are reachable only through Add New Patient (consent)
        if (allowMissingConnection) {
          const patient = await User.findById(patientId).select('isOnusUser').lean();
          if (!patient || patient.isOnusUser !== false) return next();
          return res.status(403).json({
            success: false,
            code: 'CONSENT_REQUIRED',
            message: 'Add this patient via Add New Patient so they can give consent'
          });
        }
        return res.status(403).json({ success: false, message: 'No connection to this patient' });
      }

      return res.status(403).json({
        success: false,
        code: 'CONSENT_REQUIRED',
        consentStatus: (connections[0].consent && connections[0].consent.status) || null,
        message: 'The patient has not given consent, so this action is not available'
      });
    } catch (error) {
      logger.error('Error in requireActiveConsent middleware:', error);
      return res.status(500).json({ success: false, message: 'Server error during consent check' });
    }
  };

module.exports = {
  authenticateJWT,
  authRateLimiter,
  passwordResetLimiter,
  consentLinkLimiter,
  sessionTimeout,
  isAdmin,
  isProvider,
  isVerifiedProvider,
  isPatient,
  isAdminOrProvider,
  isAdminOrVerifiedProvider,
  isOwnProfileOrAdmin,
  isPracticeAdmin,
  isProviderOrPracticeAdmin,
  canPracticeAdminAccessPatient,
  canProviderAccessPatient,
  getActiveConnection,
  activePatientIds,
  consentedConsultationFilter,
  sendConsentRequired,
  requireActiveConsent,
  patientFromParam,
  patientFromBody,
  patientFromDocument,
  patientFromConsultationBody
};
