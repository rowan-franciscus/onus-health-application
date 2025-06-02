const express = require('express');
const router = express.Router({ mergeParams: true }); // To access consultationId from parent router
const { body, param, query } = require('express-validator');

// Import middleware
const { authenticateJWT, isProvider } = require('../../middleware/auth.middleware');
const { validateRequest } = require('../../middleware/validation.middleware');

// Import lab results controller
const labResultsController = require('../../controllers/medicalRecords/labResults.controller');

// Create lab result record
router.post(
  '/',
  authenticateJWT,
  isProvider,
  [
    body('testName').notEmpty().withMessage('Test name is required'),
    body('labName').notEmpty().withMessage('Lab name is required'),
    body('dateOfTest').isISO8601().withMessage('Date of test must be a valid date'),
    body('results').notEmpty().withMessage('Results are required'),
    body('comments').optional().isString(),
  ],
  validateRequest,
  labResultsController.createLabResult
);

// Get lab results for a consultation
router.get(
  '/',
  authenticateJWT,
  labResultsController.getLabResultsForConsultation
);

// Get all lab result records with filtering and pagination
router.get(
  '/all',
  authenticateJWT,
  [
    query('patientId').optional().isMongoId().withMessage('Invalid patient ID format'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    query('search').optional().isString().withMessage('Search term must be a string'),
    query('sortBy').optional().isIn(['date', 'testName', 'labName', 'createdAt']).withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  ],
  validateRequest,
  labResultsController.getAllLabResults
);

// Update lab result record
router.put(
  '/:id',
  authenticateJWT,
  isProvider,
  [
    param('id').isMongoId().withMessage('Invalid lab result ID'),
    body('testName').optional().notEmpty().withMessage('Test name cannot be empty'),
    body('labName').optional().notEmpty().withMessage('Lab name cannot be empty'),
    body('dateOfTest').optional().isISO8601().withMessage('Date of test must be a valid date'),
    body('results').optional().notEmpty().withMessage('Results cannot be empty'),
    body('comments').optional().isString(),
  ],
  validateRequest,
  labResultsController.updateLabResult
);

// Delete lab result record
router.delete(
  '/:id',
  authenticateJWT,
  isProvider,
  param('id').isMongoId().withMessage('Invalid lab result ID'),
  validateRequest,
  labResultsController.deleteLabResult
);

module.exports = router; 