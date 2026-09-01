const express = require('express');
const router = express.Router();

const { authenticateJWT, isProvider } = require('../middleware/auth.middleware');
const controller = require('../controllers/biometric.controller');
const { auditRead } = require('../middleware/audit.middleware');

router.get('/:patientId', authenticateJWT, auditRead('Biometric'), controller.listBiometricsForPatient);
router.post('/:patientId', authenticateJWT, isProvider, controller.createBiometric);

module.exports = router;
