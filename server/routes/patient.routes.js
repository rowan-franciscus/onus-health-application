const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const { authenticateJWT, isVerifiedProvider } = require('../middleware/auth.middleware');
const { consentFormUpload, handleUploadErrors } = require('../middleware/upload.middleware');

// POST /api/patients/register-new — provider registers a new non-Onus patient.
// JSON, or multipart with an optional signed consent form ('consentForm')
router.post('/register-new', authenticateJWT, isVerifiedProvider, consentFormUpload, handleUploadErrors, patientController.registerNewPatient);

module.exports = router;
