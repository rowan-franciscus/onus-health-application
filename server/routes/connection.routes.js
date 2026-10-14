const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');

// Import middleware
const { authenticateJWT, isProvider, isPatient, requireActiveConsent, patientFromDocument } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');

// Import connection controller
const connectionController = require('../controllers/connection.controller');
const consentController = require('../controllers/consent.controller');

// PATIENT SPECIFIC ROUTES - More specific routes first
// ---------------------------------------------------------------

// Get connection requests for a patient
router.get('/patient/requests', authenticateJWT, isPatient, connectionController.getPatientConnectionRequests);

// Respond to a connection request (approve/deny full access)
router.post('/patient/respond/:requestId', authenticateJWT, isPatient, 
  [
    param('requestId').isMongoId().withMessage('Invalid request ID'),
    body('action').isIn(['approve', 'deny']).withMessage('Action must be either "approve" or "deny"'),
  ],
  validateRequest,
  connectionController.respondToConnectionRequest
);

// Revoke provider access (patient removes provider)
router.post('/patient/revoke/:connectionId', authenticateJWT, isPatient,
  [
    param('connectionId').isMongoId().withMessage('Invalid connection ID'),
  ],
  validateRequest,
  connectionController.revokeConnection
);

// Grant full access directly (patient action)
router.post('/patient/grant-full-access/:connectionId', authenticateJWT, isPatient,
  [
    param('connectionId').isMongoId().withMessage('Invalid connection ID'),
  ],
  validateRequest,
  connectionController.grantFullAccess
);

// Consents from provider-initiated onboarding (view, respond, withdraw)
router.get('/patient/consents', authenticateJWT, isPatient, consentController.getMyConsents);

router.post('/patient/consent/:connectionId/respond', authenticateJWT, isPatient,
  [
    param('connectionId').isMongoId().withMessage('Invalid connection ID'),
    body('decision').isIn(['accept', 'decline']).withMessage('Decision must be either "accept" or "decline"'),
    body('textVersion').isString().withMessage('Consent text version is required'),
  ],
  validateRequest,
  consentController.respondAsPatient
);

router.post('/patient/consent/:connectionId/withdraw', authenticateJWT, isPatient,
  [
    param('connectionId').isMongoId().withMessage('Invalid connection ID'),
  ],
  validateRequest,
  consentController.withdrawConsent
);

// PROVIDER SPECIFIC ROUTES
// ---------------------------------------------------------------

// Request full access for an existing connection
router.post('/provider/request-full-access/:connectionId', authenticateJWT, isProvider,
  [
    param('connectionId').isMongoId().withMessage('Invalid connection ID'),
  ],
  validateRequest,
  requireActiveConsent(patientFromDocument('Connection', 'connectionId')),
  connectionController.requestFullAccess
);

// GENERAL ROUTES
// ---------------------------------------------------------------

// Get all connections for the current user
router.get(
  '/',
  authenticateJWT,
  [
    query('accessLevel').optional().isIn(['limited', 'full']).withMessage('Invalid access level'),
    query('fullAccessStatus').optional().isIn(['none', 'pending', 'approved', 'denied']).withMessage('Invalid full access status'),
  ],
  validateRequest,
  connectionController.getConnections
);

// Create a new connection (provider initiated)
router.post(
  '/',
  authenticateJWT,
  isProvider,
  [
    body('patientEmail').isEmail().withMessage('Valid patient email is required'),
    body('notes').optional().isString(),
    body('fullAccessRequested').optional().isBoolean().withMessage('Full access requested must be a boolean'),
  ],
  validateRequest,
  connectionController.createConnection
);

// Get a specific connection
router.get(
  '/:id',
  authenticateJWT,
  param('id').isMongoId().withMessage('Invalid connection ID'),
  validateRequest,
  connectionController.getConnectionById
);

// Delete a connection completely
router.delete(
  '/:id',
  authenticateJWT,
  param('id').isMongoId().withMessage('Invalid connection ID'),
  validateRequest,
  connectionController.deleteConnection
);

module.exports = router; 