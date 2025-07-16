const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');

// Import middleware
const { 
  authenticateJWT, 
  isProvider, 
  isAdminOrProvider,
  isOwnProfileOrAdmin,
  isPatient
} = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { uploadConsultationFile } = require('../middleware/upload.middleware');

// Import consultation controller
const consultationController = require('../controllers/consultation.controller');

// Basic test route
router.get('/test', (req, res) => {
  res.json({ message: 'Consultation routes test successful' });
});

// PATIENT SPECIFIC ROUTES - These need to come before generic routes with params
// ---------------------------------------------------------------

// Get recent consultations for a patient
router.get('/patient/recent', authenticateJWT, isPatient, (req, res) => {
  consultationController.getPatientConsultations(req, res);
});

// Get consultation statistics for a patient
router.get('/patient/statistics', authenticateJWT, isPatient, (req, res) => {
  consultationController.getPatientConsultationStatistics(req, res);
});

// Get all consultations for a patient
router.get('/patient', authenticateJWT, isPatient, (req, res) => {
  consultationController.getPatientConsultations(req, res);
});

// GENERAL ROUTES - These come after the more specific routes
// ---------------------------------------------------------------

// Get all consultations (with filtering)
router.get('/', authenticateJWT, 
  query('patient').optional().isMongoId().withMessage('Invalid patient ID'),
  query('provider').optional().isMongoId().withMessage('Invalid provider ID'),
  query('status').optional().isIn(['draft', 'completed', 'archived']).withMessage('Invalid status'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  validateRequest, 
  (req, res) => {
    consultationController.getAllConsultations(req, res);
  }
);

// Get a specific consultation
router.get('/:id', 
  // Debug middleware
  (req, res, next) => {
    console.log('=== GET /consultations/:id route hit ===');
    console.log('Params:', req.params);
    console.log('Headers:', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      contentType: req.headers['content-type']
    });
    next();
  },
  authenticateJWT, 
  // Post-auth debug middleware
  (req, res, next) => {
    console.log('=== After authenticateJWT ===');
    console.log('User:', req.user ? { id: req.user.id, role: req.user.role } : 'No user');
    next();
  },
  param('id').isMongoId().withMessage('Invalid consultation ID'),
  validateRequest, 
  (req, res) => {
    console.log('=== Calling consultationController.getConsultationById ===');
    consultationController.getConsultationById(req, res);
  }
);

// Create a new consultation (provider only)
router.post('/', authenticateJWT, isProvider, 
  body('patient').optional().isMongoId().withMessage('Patient ID must be a valid ID'),
  body('patientEmail').optional().isEmail().withMessage('Patient email must be a valid email'),
  body().custom((value) => {
    if (!value.patient && !value.patientEmail) {
      throw new Error('Either patient ID or patient email is required');
    }
    return true;
  }),
  body('general.specialistName').notEmpty().withMessage('Specialist name is required'),
  body('general.specialty').notEmpty().withMessage('Specialty is required'),
  // Only require reasonForVisit for completed consultations
  body('general.reasonForVisit').custom((value, { req }) => {
    if (req.body.status === 'completed' && (!value || value.trim() === '')) {
      throw new Error('Reason for visit is required for completed consultations');
    }
    return true;
  }),
  validateRequest, 
  (req, res) => {
    consultationController.createConsultation(req, res);
  }
);

// Update a consultation (provider only)
router.put('/:id', authenticateJWT, isProvider, 
  param('id').isMongoId().withMessage('Invalid consultation ID'),
  body('general').optional(),
  body('status').optional().isIn(['draft', 'completed', 'archived']).withMessage('Invalid status'),
  validateRequest, 
  (req, res) => {
    consultationController.updateConsultation(req, res);
  }
);

// Delete a consultation (provider only)
router.delete('/:id', authenticateJWT, isProvider, 
  param('id').isMongoId().withMessage('Invalid consultation ID'),
  validateRequest, 
  (req, res) => {
    consultationController.deleteConsultation(req, res);
  }
);

// Consultation attachments
router.post('/:id/attachments', authenticateJWT, isProvider,
  param('id').isMongoId().withMessage('Invalid consultation ID'),
  validateRequest, 
  uploadConsultationFile.single('file'), 
  (req, res) => {
    consultationController.addAttachment(req, res);
  }
);

router.delete('/:id/attachments/:attachmentId', authenticateJWT, isProvider, 
  param('id').isMongoId().withMessage('Invalid consultation ID'),
  param('attachmentId').isMongoId().withMessage('Invalid attachment ID'),
  validateRequest, 
  (req, res) => {
    consultationController.deleteAttachment(req, res);
  }
);

// Import medical record routes
const vitalsRoutes = require('./medicalRecords/vitals.routes');
const medicationsRoutes = require('./medicalRecords/medications.routes');
const immunizationsRoutes = require('./medicalRecords/immunizations.routes');
const labResultsRoutes = require('./medicalRecords/labResults.routes');
const radiologyReportsRoutes = require('./medicalRecords/radiologyReports.routes');
const hospitalRecordsRoutes = require('./medicalRecords/hospitalRecords.routes');
const surgeryRecordsRoutes = require('./medicalRecords/surgeryRecords.routes');

// Mount medical record routes
router.use('/:consultationId/vitals', vitalsRoutes);
router.use('/:consultationId/medications', medicationsRoutes);
router.use('/:consultationId/immunizations', immunizationsRoutes);
router.use('/:consultationId/lab-results', labResultsRoutes);
router.use('/:consultationId/radiology-reports', radiologyReportsRoutes);
router.use('/:consultationId/hospital-records', hospitalRecordsRoutes);
router.use('/:consultationId/surgery-records', surgeryRecordsRoutes);

module.exports = router; 