const express = require('express');
const router = express.Router({ mergeParams: true }); // To access consultationId from parent router
const { body, param, query } = require('express-validator');

// Import middleware
const { authenticateJWT, isProvider } = require('../../middleware/auth.middleware');
const { validateRequest } = require('../../middleware/validation.middleware');

// Import radiology reports controller
const radiologyReportsController = require('../../controllers/medicalRecords/radiologyReports.controller');

// Create radiology report record
router.post(
  '/',
  authenticateJWT,
  isProvider,
  [
    body('typeOfScan').notEmpty().withMessage('Type of scan is required'),
    body('date').isISO8601().withMessage('Date must be a valid date'),
    body('bodyPartExamined').notEmpty().withMessage('Body part examined is required'),
    body('findings').notEmpty().withMessage('Findings are required'),
    body('recommendations').optional().isString(),
  ],
  validateRequest,
  radiologyReportsController.createRadiologyReport
);

// Get radiology reports for a consultation
router.get(
  '/',
  authenticateJWT,
  radiologyReportsController.getRadiologyReportsForConsultation
);

// Get all radiology report records with filtering and pagination
router.get(
  '/all',
  authenticateJWT,
  [
    query('patientId').optional().isMongoId().withMessage('Invalid patient ID format'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    query('search').optional().isString().withMessage('Search term must be a string'),
    query('sortBy').optional().isIn(['date', 'typeOfScan', 'bodyPartExamined', 'createdAt']).withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  ],
  validateRequest,
  radiologyReportsController.getAllRadiologyReports
);

// Update radiology report record
router.put(
  '/:id',
  authenticateJWT,
  isProvider,
  [
    param('id').isMongoId().withMessage('Invalid radiology report ID'),
    body('typeOfScan').optional().notEmpty().withMessage('Type of scan cannot be empty'),
    body('date').optional().isISO8601().withMessage('Date must be a valid date'),
    body('bodyPartExamined').optional().notEmpty().withMessage('Body part examined cannot be empty'),
    body('findings').optional().notEmpty().withMessage('Findings cannot be empty'),
    body('recommendations').optional().isString(),
  ],
  validateRequest,
  radiologyReportsController.updateRadiologyReport
);

// Delete radiology report record
router.delete(
  '/:id',
  authenticateJWT,
  isProvider,
  param('id').isMongoId().withMessage('Invalid radiology report ID'),
  validateRequest,
  radiologyReportsController.deleteRadiologyReport
);

module.exports = router; 