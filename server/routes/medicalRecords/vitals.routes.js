const express = require('express');
const router = express.Router({ mergeParams: true }); // To access consultationId from parent router
const { body, param, query } = require('express-validator');

// Import middleware
const { authenticateJWT, isProvider } = require('../../middleware/auth.middleware');
const { validateRequest } = require('../../middleware/validation.middleware');

// Import vitals controller
const vitalsController = require('../../controllers/medicalRecords/vitals.controller');

// Create vitals record
router.post('/', authenticateJWT, isProvider, [
  body('heartRate').optional().isFloat({ min: 0 }).withMessage('Heart rate must be a positive number'),
  body('bloodPressure.systolic').optional().isFloat({ min: 0 }).withMessage('Systolic pressure must be a positive number'),
  body('bloodPressure.diastolic').optional().isFloat({ min: 0 }).withMessage('Diastolic pressure must be a positive number'),
  body('bodyFatPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Body fat percentage must be between 0 and 100'),
  body('bmi').optional().isFloat({ min: 0 }).withMessage('BMI must be a positive number'),
  body('weight').optional().isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
  body('height').optional().isFloat({ min: 0 }).withMessage('Height must be a positive number'),
  body('bodyTemperature').optional().isFloat({ min: 0 }).withMessage('Body temperature must be a positive number'),
  body('bloodGlucose').optional().isFloat({ min: 0 }).withMessage('Blood glucose must be a positive number'),
  body('bloodOxygenSaturation').optional().isFloat({ min: 0, max: 100 }).withMessage('Blood oxygen saturation must be between 0 and 100'),
  body('respiratoryRate').optional().isFloat({ min: 0 }).withMessage('Respiratory rate must be a positive number'),
  body('notes').optional().isString(),
], validateRequest, (req, res) => {
  vitalsController.createVitals(req, res);
});

// Get vitals for a consultation
router.get('/', authenticateJWT, (req, res) => {
  vitalsController.getVitalsForConsultation(req, res);
});

// Get all vitals records with filtering and pagination
router.get('/all', authenticateJWT, [
  query('patientId').optional().isMongoId().withMessage('Invalid patient ID format'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
  query('search').optional().isString().withMessage('Search term must be a string'),
  query('sortBy').optional().isIn(['date', 'value', 'createdAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
], validateRequest, (req, res, next) => {
  vitalsController.getAllVitals(req, res, next);
});

// Update vitals record
router.put('/:id', authenticateJWT, isProvider, [
  param('id').isMongoId().withMessage('Invalid vitals ID'),
  body('heartRate').optional().isFloat({ min: 0 }).withMessage('Heart rate must be a positive number'),
  body('bloodPressure.systolic').optional().isFloat({ min: 0 }).withMessage('Systolic pressure must be a positive number'),
  body('bloodPressure.diastolic').optional().isFloat({ min: 0 }).withMessage('Diastolic pressure must be a positive number'),
  body('bodyFatPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Body fat percentage must be between 0 and 100'),
  body('bmi').optional().isFloat({ min: 0 }).withMessage('BMI must be a positive number'),
  body('weight').optional().isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
  body('height').optional().isFloat({ min: 0 }).withMessage('Height must be a positive number'),
  body('bodyTemperature').optional().isFloat({ min: 0 }).withMessage('Body temperature must be a positive number'),
  body('bloodGlucose').optional().isFloat({ min: 0 }).withMessage('Blood glucose must be a positive number'),
  body('bloodOxygenSaturation').optional().isFloat({ min: 0, max: 100 }).withMessage('Blood oxygen saturation must be between 0 and 100'),
  body('respiratoryRate').optional().isFloat({ min: 0 }).withMessage('Respiratory rate must be a positive number'),
  body('notes').optional().isString(),
], validateRequest, (req, res) => {
  vitalsController.updateVitals(req, res);
});

// Delete vitals record
router.delete('/:id', authenticateJWT, isProvider, 
param('id').isMongoId().withMessage('Invalid vitals ID'),
validateRequest, (req, res) => {
  vitalsController.deleteVitals(req, res);
});

module.exports = router; 