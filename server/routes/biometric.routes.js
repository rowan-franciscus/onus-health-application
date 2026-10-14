const express = require('express');
const router = express.Router();

const { authenticateJWT, isProvider, requireActiveConsent, patientFromParam } = require('../middleware/auth.middleware');
const controller = require('../controllers/biometric.controller');
const { auditRead } = require('../middleware/audit.middleware');

const consentForPatient = requireActiveConsent(patientFromParam('patientId'));

router.get('/:patientId', authenticateJWT, auditRead('Biometric'), consentForPatient, controller.listBiometricsForPatient);
router.post('/:patientId', authenticateJWT, isProvider, consentForPatient, controller.createBiometric);

module.exports = router;
