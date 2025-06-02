const express = require('express');
const router = express.Router();
const { query, param } = require('express-validator');

// Import middleware
const { authenticateJWT, isProvider, isPatient, isAdminOrProvider } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');

// Import medical record controller
const medicalRecordController = require('../controllers/medicalRecord.controller');

// Valid medical record types
const VALID_TYPES = [
  'vitals', 
  'medications', 
  'immunizations', 
  'lab-results', 
  'radiology-reports', 
  'hospital-records', 
  'surgery-records'
];

// Basic test route
router.get('/test', (req, res) => {
  res.json({ message: 'Medical record routes test successful' });
});

// Patient vitals route
router.get('/patient/vitals/recent', authenticateJWT, isPatient, medicalRecordController.getPatientRecentVitals);

// Provider routes
router.get('/provider/vitals', authenticateJWT, isProvider, 
  [
    query('patientId').optional().isMongoId().withMessage('Invalid patient ID'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ],
  validateRequest,
  medicalRecordController.getProviderVitals
);

// Get medical records by type for provider
router.get('/provider/:type', authenticateJWT, isProvider,
  [
    param('type').isIn(['vitals', 'medications', 'immunizations', 'lab-results', 'radiology-reports', 'hospital-records', 'surgery-records']).withMessage('Invalid record type'),
    query('patientId').optional().isMongoId().withMessage('Invalid patient ID'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ],
  validateRequest,
  medicalRecordController.getMedicalRecordsByType
);

// Get specific radiology reports with special handling
router.get('/radiology-reports', authenticateJWT, isAdminOrProvider, 
  [
    query('patientId').optional().isMongoId().withMessage('Invalid patient ID'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ],
  validateRequest,
  medicalRecordController.getRadiologyReports
);

// Get all medical records of a specific type for a patient
router.get(
  '/:type',
  authenticateJWT,
  [
    param('type')
      .isIn(VALID_TYPES)
      .withMessage(`Type must be one of: ${VALID_TYPES.join(', ')}`),
    query('patientId')
      .optional()
      .isMongoId()
      .withMessage('Invalid patient ID format'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO date'),
    query('search')
      .optional()
      .isString()
      .withMessage('Search term must be a string'),
    query('sortBy')
      .optional()
      .isIn(['date', 'value', 'name', 'createdAt'])
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
  ],
  validateRequest,
  medicalRecordController.getMedicalRecordsByType
);

// Special route for radiology (client uses 'radiology' but we use 'radiology-reports')
router.get('/radiology', authenticateJWT, medicalRecordController.getRadiologyReports);

// Get statistics/aggregates for medical records
router.get(
  '/:type/statistics',
  authenticateJWT,
  [
    param('type')
      .isIn(VALID_TYPES)
      .withMessage(`Type must be one of: ${VALID_TYPES.join(', ')}`),
    query('patientId')
      .optional()
      .isMongoId()
      .withMessage('Invalid patient ID format'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO date'),
  ],
  validateRequest,
  medicalRecordController.getMedicalRecordStatistics
);

module.exports = router; 