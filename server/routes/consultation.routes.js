const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');

// Import middleware
const { 
  authenticateJWT, 
  isProvider, 
  isAdminOrProvider,
  isOwnProfileOrAdmin,
  isPatient,
  requireActiveConsent,
  patientFromDocument,
  patientFromConsultationBody
} = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { auditRead } = require('../middleware/audit.middleware');
const { uploadConsultationFile } = require('../middleware/upload.middleware');

// Import consultation controller
const consultationController = require('../controllers/consultation.controller');

// Patient consent must be ACTIVE for providers to read or change a consultation
const consentForConsultation = (param) => requireActiveConsent(patientFromDocument('Consultation', param));

// Basic test route
router.get('/test', (req, res) => {
  res.json({ message: 'Consultation routes test successful' });
});

// PATIENT SPECIFIC ROUTES - These need to come before generic routes with params
// ---------------------------------------------------------------

// Get recent consultations for a patient
router.get('/patient/recent', authenticateJWT, isPatient, auditRead('Consultation'), (req, res) => {
  consultationController.getPatientConsultations(req, res);
});

// Get consultation statistics for a patient
router.get('/patient/statistics', authenticateJWT, isPatient, auditRead('Consultation'), (req, res) => {
  consultationController.getPatientConsultationStatistics(req, res);
});

// Get all consultations for a patient
router.get('/patient', authenticateJWT, isPatient, auditRead('Consultation'), (req, res) => {
  consultationController.getPatientConsultations(req, res);
});

// GENERAL ROUTES - These come after the more specific routes
// ---------------------------------------------------------------

// Get all consultations (with filtering)
router.get('/', authenticateJWT, auditRead('Consultation'),
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
  auditRead('Consultation'),
  consentForConsultation('id'),
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
  // A missing connection is allowed: creating a consultation for a real
  // patient account connects them (path 1); placeholders are refused in the controller
  requireActiveConsent(patientFromConsultationBody, { allowMissingConnection: true }),
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
  consentForConsultation('id'),
  (req, res) => {
    console.log('=== PUT /consultations/:id route hit ===');
    console.log('Consultation ID:', req.params.id);
    console.log('User:', req.user ? { id: req.user.id, role: req.user.role } : 'No user');
    
    // Temporarily use the simple update without transactions
    const simpleController = require('../controllers/consultation.controller.simple');
    simpleController.updateConsultationSimple(req, res);
  }
);

// Add a follow-up to a consultation (provider only)
router.post('/:id/follow-ups', authenticateJWT, isProvider,
  param('id').isMongoId().withMessage('Invalid consultation ID'),
  body('general.specialistName').notEmpty().withMessage('Specialist name is required'),
  body('general.specialty').notEmpty().withMessage('Specialty is required'),
  body('general.reasonForVisit').custom((value, { req }) => {
    if (req.body.status === 'completed' && (!value || value.trim() === '')) {
      throw new Error('Reason for visit is required for completed consultations');
    }
    return true;
  }),
  validateRequest,
  consentForConsultation('id'),
  (req, res) => {
    consultationController.addFollowUp(req, res);
  }
);

// Close a consultation case (provider only)
router.post('/:id/close', authenticateJWT, isProvider,
  param('id').isMongoId().withMessage('Invalid consultation ID'),
  validateRequest,
  consentForConsultation('id'),
  (req, res) => {
    consultationController.closeCase(req, res);
  }
);

// Reopen a closed consultation case (provider only)
router.post('/:id/reopen', authenticateJWT, isProvider,
  param('id').isMongoId().withMessage('Invalid consultation ID'),
  validateRequest,
  consentForConsultation('id'),
  (req, res) => {
    consultationController.reopenCase(req, res);
  }
);

// Delete a consultation (provider only)
router.delete('/:id', authenticateJWT, isProvider,
  param('id').isMongoId().withMessage('Invalid consultation ID'),
  validateRequest, 
  consentForConsultation('id'),
  (req, res) => {
    consultationController.deleteConsultation(req, res);
  }
);

// Consultation attachments
router.post('/:id/attachments', authenticateJWT, isProvider,
  param('id').isMongoId().withMessage('Invalid consultation ID'),
  validateRequest, 
  consentForConsultation('id'),
  uploadConsultationFile.single('file'), 
  (req, res) => {
    consultationController.addAttachment(req, res);
  }
);

router.delete('/:id/attachments/:attachmentId', authenticateJWT, isProvider, 
  param('id').isMongoId().withMessage('Invalid consultation ID'),
  param('attachmentId').isMongoId().withMessage('Invalid attachment ID'),
  validateRequest, 
  consentForConsultation('id'),
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
// authenticateJWT runs here so the consent guard sees req.user; the
// sub-routers re-run it, which is harmless
const subRecordGuard = [authenticateJWT, consentForConsultation('consultationId')];
router.use('/:consultationId/vitals', subRecordGuard, vitalsRoutes);
router.use('/:consultationId/medications', subRecordGuard, medicationsRoutes);
router.use('/:consultationId/immunizations', subRecordGuard, immunizationsRoutes);
router.use('/:consultationId/lab-results', subRecordGuard, labResultsRoutes);
router.use('/:consultationId/radiology-reports', subRecordGuard, radiologyReportsRoutes);
router.use('/:consultationId/hospital-records', subRecordGuard, hospitalRecordsRoutes);
router.use('/:consultationId/surgery-records', subRecordGuard, surgeryRecordsRoutes);

module.exports = router; 