const express = require('express');
const router = express.Router();

const { authenticateJWT, isProvider } = require('../middleware/auth.middleware');
const controller = require('../controllers/hospitalAdmission.controller');

router.get('/patient/:patientId', authenticateJWT, controller.listAdmissionsForPatient);

router.get('/', authenticateJWT, isProvider, controller.listAdmissionsForProvider);
router.post('/', authenticateJWT, isProvider, controller.createAdmission);

router.get('/:admissionId', authenticateJWT, controller.getAdmissionById);
router.post('/:admissionId/observations', authenticateJWT, isProvider, controller.addObservation);
router.patch('/:admissionId/discharge', authenticateJWT, isProvider, controller.dischargePatient);
router.patch('/:admissionId/readmit', authenticateJWT, isProvider, controller.reAdmitPatient);

module.exports = router;
