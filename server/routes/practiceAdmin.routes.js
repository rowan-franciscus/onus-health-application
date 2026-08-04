const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/practiceAdmin.controller');
const { authenticateJWT, isPracticeAdmin } = require('../middleware/auth.middleware');
const { auditRead } = require('../middleware/audit.middleware');

// All practice-admin endpoints require an active practice_admin user.
router.use(authenticateJWT, isPracticeAdmin);

router.get('/practice', ctrl.getPractice);

router.get('/patients', auditRead('Patient'), ctrl.getPatients);
router.post('/patients', ctrl.registerPatient);
router.get('/patients/:patientId', auditRead('Patient'), ctrl.getPatientById);
router.get('/patients/:patientId/operational-overview', auditRead('Patient'), ctrl.getOperationalOverview);

router.get('/billing', auditRead('Billing'), ctrl.getBilling);
router.patch('/billing/:consultationId/status', ctrl.updateBillingStatus);
router.get('/billing/export/data', auditRead('Billing', { type: 'export', subtype: 'billing-export', action: 'E' }), ctrl.exportBillingData);
router.get('/billing/export/csv', auditRead('Billing', { type: 'export', subtype: 'billing-export', action: 'E' }), ctrl.exportBillingCsv);

module.exports = router;
