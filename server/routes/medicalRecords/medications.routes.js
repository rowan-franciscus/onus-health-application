const express = require('express');
const router = express.Router({ mergeParams: true }); // To access consultationId from parent router
const { body, param, query } = require('express-validator');

// Import middleware
const { authenticateJWT, isProvider } = require('../../middleware/auth.middleware');
const { validateRequest } = require('../../middleware/validation.middleware');

// Import medications controller
const medicationsController = require('../../controllers/medicalRecords/medications.controller');

// Create medication record
router.post(
  '/',
  authenticateJWT,
  isProvider,
  [
    body('name').notEmpty().withMessage('Medication name is required'),
    body('dosage').notEmpty().withMessage('Dosage is required'),
    body('frequency').notEmpty().withMessage('Frequency is required'),
    body('reasonForPrescription').notEmpty().withMessage('Reason for prescription is required'),
    body('startDate').isISO8601().withMessage('Start date must be a valid date'),
    body('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    body('notes').optional().isString(),
  ],
  validateRequest,
  medicationsController.createMedication
);

// Get medications for a consultation
router.get(
  '/',
  authenticateJWT,
  medicationsController.getMedicationsForConsultation
);

// Get all medication records with filtering and pagination
router.get(
  '/all',
  authenticateJWT,
  [
    query('patientId').optional().isMongoId().withMessage('Invalid patient ID format'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    query('search').optional().isString().withMessage('Search term must be a string'),
    query('sortBy').optional().isIn(['date', 'name', 'createdAt']).withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  ],
  validateRequest,
  medicationsController.getAllMedications
);

// Update medication record
router.put(
  '/:id',
  authenticateJWT,
  isProvider,
  [
    param('id').isMongoId().withMessage('Invalid medication ID'),
    body('name').optional().notEmpty().withMessage('Medication name cannot be empty'),
    body('dosage').optional().notEmpty().withMessage('Dosage cannot be empty'),
    body('frequency').optional().notEmpty().withMessage('Frequency cannot be empty'),
    body('reasonForPrescription').optional().notEmpty().withMessage('Reason for prescription cannot be empty'),
    body('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    body('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    body('notes').optional().isString(),
  ],
  validateRequest,
  medicationsController.updateMedication
);

// Delete medication record
router.delete(
  '/:id',
  authenticateJWT,
  isProvider,
  param('id').isMongoId().withMessage('Invalid medication ID'),
  validateRequest,
  medicationsController.deleteMedication
);

module.exports = router; 