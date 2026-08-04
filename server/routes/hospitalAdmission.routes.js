const express = require('express');
const router = express.Router();

const { authenticateJWT, isProvider } = require('../middleware/auth.middleware');
const controller = require('../controllers/hospitalAdmission.controller');
const { auditRead } = require('../middleware/audit.middleware');

router.get('/patient/:patientId', authenticateJWT, auditRead('HospitalAdmission'), controller.listAdmissionsForPatient);

router.get('/', authenticateJWT, isProvider, auditRead('HospitalAdmission'), controller.listAdmissionsForProvider);
router.post('/', authenticateJWT, isProvider, controller.createAdmission);

router.get('/:admissionId', authenticateJWT, auditRead('HospitalAdmission'), controller.getAdmissionById);
router.post('/:admissionId/observations', authenticateJWT, isProvider, controller.addObservation);
router.patch('/:admissionId/discharge', authenticateJWT, isProvider, controller.dischargePatient);
router.patch('/:admissionId/readmit', authenticateJWT, isProvider, controller.reAdmitPatient);

module.exports = router;
