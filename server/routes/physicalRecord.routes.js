const express = require('express');
const router = express.Router();
const { authenticateJWT, isProvider } = require('../middleware/auth.middleware');
const { uploadPhysicalRecordFile, handleUploadErrors } = require('../middleware/upload.middleware');
const physicalRecordController = require('../controllers/physicalRecord.controller');

router.post(
  '/patients/:patientId/physical-records',
  authenticateJWT,
  isProvider,
  uploadPhysicalRecordFile.single('file'),
  handleUploadErrors,
  physicalRecordController.createPhysicalRecord
);

router.get(
  '/patients/:patientId/physical-records',
  authenticateJWT,
  physicalRecordController.getPhysicalRecords
);

router.delete(
  '/patients/:patientId/physical-records/:recordId',
  authenticateJWT,
  isProvider,
  physicalRecordController.deletePhysicalRecord
);

module.exports = router;
