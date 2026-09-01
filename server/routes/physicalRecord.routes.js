const express = require('express');
const router = express.Router();
const { authenticateJWT, isProvider, isAdminOrProvider, isProviderOrPracticeAdmin } = require('../middleware/auth.middleware');
const { uploadPhysicalRecordFile, handleUploadErrors } = require('../middleware/upload.middleware');
const physicalRecordController = require('../controllers/physicalRecord.controller');
const { auditRead } = require('../middleware/audit.middleware');

router.post(
  '/patients/:patientId/physical-records',
  authenticateJWT,
  isProviderOrPracticeAdmin,
  uploadPhysicalRecordFile.single('file'),
  handleUploadErrors,
  physicalRecordController.createPhysicalRecord
);

router.get(
  '/patients/:patientId/physical-records',
  authenticateJWT,
  auditRead('PhysicalRecord'),
  physicalRecordController.getPhysicalRecords
);

router.delete(
  '/patients/:patientId/physical-records/:recordId',
  authenticateJWT,
  isAdminOrProvider,
  physicalRecordController.deletePhysicalRecord
);

module.exports = router;
