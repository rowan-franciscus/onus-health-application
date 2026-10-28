const express = require('express');
const router = express.Router();
const { authenticateJWT, isProvider, isAdminOrProvider, isProviderOrPracticeAdmin, requireActiveConsent, patientFromParam } = require('../middleware/auth.middleware');
const { uploadPhysicalRecordFile, sanitizeMultipartBody, handleUploadErrors } = require('../middleware/upload.middleware');
const physicalRecordController = require('../controllers/physicalRecord.controller');
const { auditRead } = require('../middleware/audit.middleware');

const consentForPatient = requireActiveConsent(patientFromParam('patientId'));

router.post(
  '/patients/:patientId/physical-records',
  authenticateJWT,
  isProviderOrPracticeAdmin,
  // Before the upload middleware so a refused request never stores the file
  consentForPatient,
  uploadPhysicalRecordFile.single('file'),
  handleUploadErrors,
  sanitizeMultipartBody,
  physicalRecordController.createPhysicalRecord
);

router.get(
  '/patients/:patientId/physical-records',
  authenticateJWT,
  auditRead('PhysicalRecord'),
  consentForPatient,
  physicalRecordController.getPhysicalRecords
);

router.delete(
  '/patients/:patientId/physical-records/:recordId',
  authenticateJWT,
  isAdminOrProvider,
  consentForPatient,
  physicalRecordController.deletePhysicalRecord
);

module.exports = router;
