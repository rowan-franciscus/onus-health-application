const express = require('express');
const router = express.Router({ mergeParams: true }); // To access consultationId from parent router
const { body, param, query } = require('express-validator');

// Import middleware
const { authenticateJWT, isProvider } = require('../../middleware/auth.middleware');
const { validateRequest } = require('../../middleware/validation.middleware');

// Import immunizations controller
const immunizationsController = require('../../controllers/medicalRecords/immunizations.controller');

// Create immunization record
router.post(
  '/',
  authenticateJWT,
  isProvider,
  [
    body('vaccineName').notEmpty().withMessage('Vaccine name is required'),
    body('dateAdministered').isISO8601().withMessage('Date administered must be a valid date'),
    body('vaccineSerialNumber').optional().notEmpty().withMessage('Vaccine serial number cannot be empty'),
    body('nextDueDate').optional().isISO8601().withMessage('Next due date must be a valid date'),
    body('notes').optional().isString(),
  ],
  validateRequest,
  immunizationsController.createImmunization
);

// Get immunizations for a consultation
router.get(
  '/',
  authenticateJWT,
  immunizationsController.getImmunizationsForConsultation
);

// Get all immunization records with filtering and pagination
router.get(
  '/all',
  authenticateJWT,
  [
    query('patientId').optional().isMongoId().withMessage('Invalid patient ID format'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    query('search').optional().isString().withMessage('Search term must be a string'),
    query('sortBy').optional().isIn(['date', 'vaccineName', 'createdAt']).withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  ],
  validateRequest,
  immunizationsController.getAllImmunizations
);

// Update immunization record
router.put(
  '/:id',
  authenticateJWT,
  isProvider,
  [
    param('id').isMongoId().withMessage('Invalid immunization ID'),
    body('vaccineName').optional().notEmpty().withMessage('Vaccine name cannot be empty'),
    body('dateAdministered').optional().isISO8601().withMessage('Date administered must be a valid date'),
    body('vaccineSerialNumber').optional(),
    body('nextDueDate').optional().isISO8601().withMessage('Next due date must be a valid date'),
    body('notes').optional().isString(),
  ],
  validateRequest,
  immunizationsController.updateImmunization
);

// Delete immunization record
router.delete(
  '/:id',
  authenticateJWT,
  isProvider,
  param('id').isMongoId().withMessage('Invalid immunization ID'),
  validateRequest,
  immunizationsController.deleteImmunization
);

module.exports = router; 