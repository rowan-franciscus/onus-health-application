const express = require('express');
const router = express.Router();

const { authenticateJWT, isProvider, requireActiveConsent, patientFromParam, patientFromBody, patientFromDocument } = require('../middleware/auth.middleware');
const controller = require('../controllers/surgery.controller');
const { auditRead } = require('../middleware/audit.middleware');

const consentForSurgery = requireActiveConsent(patientFromDocument('Surgery', 'surgeryId'));

router.get('/patient/:patientId', authenticateJWT, auditRead('Surgery'), requireActiveConsent(patientFromParam('patientId')), controller.listSurgeriesForPatient);

router.get('/', authenticateJWT, isProvider, auditRead('Surgery'), controller.listSurgeriesForProvider);
router.post('/', authenticateJWT, isProvider, requireActiveConsent(patientFromBody('patient')), controller.createSurgery);

router.get('/:surgeryId', authenticateJWT, auditRead('Surgery'), consentForSurgery, controller.getSurgeryById);
router.post('/:surgeryId/notes', authenticateJWT, isProvider, consentForSurgery, controller.addNote);
router.patch('/:surgeryId/close', authenticateJWT, isProvider, consentForSurgery, controller.closeSurgery);
router.patch('/:surgeryId/reopen', authenticateJWT, isProvider, consentForSurgery, controller.reopenSurgery);

module.exports = router;
