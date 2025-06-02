const express = require('express');
const router = express.Router({ mergeParams: true }); // To access consultationId from parent router
const { body, param, query } = require('express-validator');

// Import middleware
const { authenticateJWT, isProvider } = require('../../middleware/auth.middleware');
const { validateRequest } = require('../../middleware/validation.middleware');

// Import surgery records controller
const surgeryRecordsController = require('../../controllers/medicalRecords/surgeryRecords.controller');

// Create surgery record
router.post(
  '/',
  authenticateJWT,
  isProvider,
  [
    body('typeOfSurgery').notEmpty().withMessage('Type of surgery is required'),
    body('date').isISO8601().withMessage('Date must be a valid date'),
    body('reason').notEmpty().withMessage('Reason is required'),
    body('complications').optional().isString(),
    body('recoveryNotes').optional().isString(),
  ],
  validateRequest,
  surgeryRecordsController.createSurgeryRecord
);

// Get surgery records for a consultation
router.get(
  '/',
  authenticateJWT,
  surgeryRecordsController.getSurgeryRecordsForConsultation
);

// Get all surgery records with filtering and pagination
router.get(
  '/all',
  authenticateJWT,
  [
    query('patientId').optional().isMongoId().withMessage('Invalid patient ID format'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    query('search').optional().isString().withMessage('Search term must be a string'),
    query('sortBy').optional().isIn(['date', 'typeOfSurgery', 'createdAt']).withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  ],
  validateRequest,
  surgeryRecordsController.getAllSurgeryRecords
);

// Update surgery record
router.put(
  '/:id',
  authenticateJWT,
  isProvider,
  [
    param('id').isMongoId().withMessage('Invalid surgery record ID'),
    body('typeOfSurgery').optional().notEmpty().withMessage('Type of surgery cannot be empty'),
    body('date').optional().isISO8601().withMessage('Date must be a valid date'),
    body('reason').optional().notEmpty().withMessage('Reason cannot be empty'),
    body('complications').optional().isString(),
    body('recoveryNotes').optional().isString(),
  ],
  validateRequest,
  surgeryRecordsController.updateSurgeryRecord
);

// Delete surgery record
router.delete(
  '/:id',
  authenticateJWT,
  isProvider,
  param('id').isMongoId().withMessage('Invalid surgery record ID'),
  validateRequest,
  surgeryRecordsController.deleteSurgeryRecord
);

module.exports = router; 