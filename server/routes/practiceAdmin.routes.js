const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/practiceAdmin.controller');
const { authenticateJWT, isPracticeAdmin } = require('../middleware/auth.middleware');

// All practice-admin endpoints require an active practice_admin user.
router.use(authenticateJWT, isPracticeAdmin);

router.get('/practice', ctrl.getPractice);

router.get('/patients', ctrl.getPatients);
router.post('/patients', ctrl.registerPatient);
router.get('/patients/:patientId', ctrl.getPatientById);
router.get('/patients/:patientId/operational-overview', ctrl.getOperationalOverview);

router.get('/billing', ctrl.getBilling);
router.patch('/billing/:consultationId/status', ctrl.updateBillingStatus);
router.get('/billing/export/data', ctrl.exportBillingData);
router.get('/billing/export/csv', ctrl.exportBillingCsv);

module.exports = router;
