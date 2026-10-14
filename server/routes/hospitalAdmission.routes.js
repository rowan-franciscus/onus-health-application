const express = require('express');
const router = express.Router();

const { authenticateJWT, isProvider, requireActiveConsent, patientFromParam, patientFromBody, patientFromDocument } = require('../middleware/auth.middleware');
const controller = require('../controllers/hospitalAdmission.controller');
const { auditRead } = require('../middleware/audit.middleware');

const consentForAdmission = requireActiveConsent(patientFromDocument('HospitalAdmission', 'admissionId'));

router.get('/patient/:patientId', authenticateJWT, auditRead('HospitalAdmission'), requireActiveConsent(patientFromParam('patientId')), controller.listAdmissionsForPatient);

router.get('/', authenticateJWT, isProvider, auditRead('HospitalAdmission'), controller.listAdmissionsForProvider);
router.post('/', authenticateJWT, isProvider, requireActiveConsent(patientFromBody('patient')), controller.createAdmission);

router.get('/:admissionId', authenticateJWT, auditRead('HospitalAdmission'), consentForAdmission, controller.getAdmissionById);
router.post('/:admissionId/observations', authenticateJWT, isProvider, consentForAdmission, controller.addObservation);
router.patch('/:admissionId/discharge', authenticateJWT, isProvider, consentForAdmission, controller.dischargePatient);
router.patch('/:admissionId/readmit', authenticateJWT, isProvider, consentForAdmission, controller.reAdmitPatient);

module.exports = router;
