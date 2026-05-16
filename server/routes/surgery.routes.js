const express = require('express');
const router = express.Router();

const { authenticateJWT, isProvider } = require('../middleware/auth.middleware');
const controller = require('../controllers/surgery.controller');

router.get('/patient/:patientId', authenticateJWT, controller.listSurgeriesForPatient);

router.get('/', authenticateJWT, isProvider, controller.listSurgeriesForProvider);
router.post('/', authenticateJWT, isProvider, controller.createSurgery);

router.get('/:surgeryId', authenticateJWT, controller.getSurgeryById);
router.post('/:surgeryId/notes', authenticateJWT, isProvider, controller.addNote);
router.patch('/:surgeryId/close', authenticateJWT, isProvider, controller.closeSurgery);
router.patch('/:surgeryId/reopen', authenticateJWT, isProvider, controller.reopenSurgery);

module.exports = router;
