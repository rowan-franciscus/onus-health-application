const express = require('express');
const router = express.Router({ mergeParams: true }); // To access consultationId from parent router
const { body, param, query } = require('express-validator');

// Import middleware
const { authenticateJWT, isProvider } = require('../../middleware/auth.middleware');
const { validateRequest } = require('../../middleware/validation.middleware');

// Import hospital records controller
const hospitalRecordsController = require('../../controllers/medicalRecords/hospitalRecords.controller');

// Create hospital record
router.post(
  '/',
  authenticateJWT,
  isProvider,
  [
    body('admissionDate').isISO8601().withMessage('Admission date must be a valid date'),
    body('dischargeDate').optional().isISO8601().withMessage('Discharge date must be a valid date'),
    body('reasonForHospitalisation').notEmpty().withMessage('Reason for hospitalisation is required'),
    body('treatmentsReceived').optional().isArray().withMessage('Treatments received must be an array'),
    body('attendingDoctors').optional().isArray().withMessage('Attending doctors must be an array'),
    body('dischargeSummary').optional().isString(),
    body('investigationsDone').optional().isArray().withMessage('Investigations done must be an array'),
  ],
  validateRequest,
  hospitalRecordsController.createHospitalRecord
);

// Get hospital records for a consultation
router.get(
  '/',
  authenticateJWT,
  hospitalRecordsController.getHospitalRecordsForConsultation
);

// Get all hospital records with filtering and pagination
router.get(
  '/all',
  authenticateJWT,
  [
    query('patientId').optional().isMongoId().withMessage('Invalid patient ID format'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    query('search').optional().isString().withMessage('Search term must be a string'),
    query('sortBy').optional().isIn(['date', 'admissionDate', 'dischargeDate', 'createdAt']).withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  ],
  validateRequest,
  hospitalRecordsController.getAllHospitalRecords
);

// Update hospital record
router.put(
  '/:id',
  authenticateJWT,
  isProvider,
  [
    param('id').isMongoId().withMessage('Invalid hospital record ID'),
    body('admissionDate').optional().isISO8601().withMessage('Admission date must be a valid date'),
    body('dischargeDate').optional().isISO8601().withMessage('Discharge date must be a valid date'),
    body('reasonForHospitalisation').optional().notEmpty().withMessage('Reason for hospitalisation cannot be empty'),
    body('treatmentsReceived').optional().isArray().withMessage('Treatments received must be an array'),
    body('attendingDoctors').optional().isArray().withMessage('Attending doctors must be an array'),
    body('dischargeSummary').optional().isString(),
    body('investigationsDone').optional().isArray().withMessage('Investigations done must be an array'),
  ],
  validateRequest,
  hospitalRecordsController.updateHospitalRecord
);

// Delete hospital record
router.delete(
  '/:id',
  authenticateJWT,
  isProvider,
  param('id').isMongoId().withMessage('Invalid hospital record ID'),
  validateRequest,
  hospitalRecordsController.deleteHospitalRecord
);

module.exports = router; 