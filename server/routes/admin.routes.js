const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');

// Import middleware
const { authenticateJWT, isAdmin } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { getConsentReport } = require('../services/consentReport.service');
const logger = require('../utils/logger');

// Import admin controller (to be implemented later)
const adminController = require('../controllers/admin.controller');

// All admin routes require admin authentication
router.use(authenticateJWT);
router.use(isAdmin);

// User management routes
router.get(
  '/users',
  [
    query('role').optional().isIn(['patient', 'provider', 'admin']).withMessage('Invalid role'),
    query('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
    query('verified').optional().isBoolean().withMessage('Verified must be a boolean'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ],
  validateRequest,
  adminController.getAllUsers
);

router.get(
  '/users/:id',
  param('id').isMongoId().withMessage('Invalid user ID'),
  validateRequest,
  adminController.getUserById
);

router.put(
  '/users/:id',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('role').optional().isIn(['patient', 'provider', 'admin']).withMessage('Invalid role'),
    body('isEmailVerified').optional().isBoolean().withMessage('Email verified must be a boolean'),
  ],
  validateRequest,
  adminController.updateUser
);

router.delete(
  '/users/:id',
  param('id').isMongoId().withMessage('Invalid user ID'),
  validateRequest,
  adminController.deleteUser
);

// Provider verification routes
router.get(
  '/provider-verifications',
  [
    query('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ],
  validateRequest,
  adminController.getProviderVerifications
);

router.put(
  '/provider-verifications/:userId',
  [
    param('userId').isMongoId().withMessage('Invalid user ID'),
    body('status').isIn(['approved', 'rejected']).withMessage('Status must be either approved or rejected'),
    body('notes').optional().isString(),
  ],
  validateRequest,
  adminController.updateProviderVerification
);

// Analytics routes
router.get(
  '/analytics',
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    query('metric').optional().isIn(['users', 'consultations', 'connections']).withMessage('Invalid metric'),
  ],
  validateRequest,
  adminController.getAnalytics
);

router.get(
  '/analytics/dashboard',
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  ],
  validateRequest,
  adminController.getDashboardAnalytics
);

router.get(
  '/analytics/engagement',
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  ],
  validateRequest,
  adminController.getEngagementAnalytics
);

// Add provider verification routes
router.get('/provider-verification-requests', adminController.getProviderVerificationRequests);
router.post('/provider-verification/:providerId', adminController.processProviderVerification);
router.post('/complete-provider-verification/:providerId', adminController.completeProviderVerification);

// Audit trail (admin only; every query is itself audited)
router.get(
  '/audit-logs',
  [
    query('patientId').optional().isMongoId().withMessage('Invalid patient ID'),
    query('actorId').optional().isMongoId().withMessage('Invalid actor ID'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    query('type').optional().isIn(['auth', 'data', 'consent', 'admin', 'export', 'security', 'audit']).withMessage('Invalid type'),
    query('subtype').optional().isString(),
    query('action').optional().isIn(['C', 'R', 'U', 'D', 'E']).withMessage('Invalid action'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ],
  validateRequest,
  adminController.getAuditLogs
);

// Admin change password
router.put('/change-password', adminController.changePassword);

// Admin profile update
router.put('/profile', adminController.updateProfile);

// Internal consent instrumentation report (patient-consent pilot)
router.get(
  '/reports/consent',
  [
    query('from').optional().isISO8601().withMessage('from must be an ISO date'),
    query('to').optional().isISO8601().withMessage('to must be an ISO date'),
    query('practiceId').optional().isMongoId().withMessage('Invalid practice ID'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { from, to, practiceId } = req.query;
      // 'to' is a calendar date: include the whole day
      const toDate = to ? new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1) : undefined;
      const report = await getConsentReport({
        from: from ? new Date(from) : undefined,
        to: toDate,
        practiceId
      });
      res.json({ success: true, report });
    } catch (error) {
      logger.error('Error building consent report:', error);
      res.status(500).json({ success: false, message: 'Failed to build consent report' });
    }
  }
);

module.exports = router; 