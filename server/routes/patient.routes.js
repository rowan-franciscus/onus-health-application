const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const { authenticateJWT, isVerifiedProvider } = require('../middleware/auth.middleware');

// POST /api/patients/register-new — provider registers a new non-Onus patient
router.post('/register-new', authenticateJWT, isVerifiedProvider, patientController.registerNewPatient);

module.exports = router;
