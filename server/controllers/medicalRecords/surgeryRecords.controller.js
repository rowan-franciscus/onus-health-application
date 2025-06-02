const mongoose = require('mongoose');
const SurgeryRecord = require('../../models/SurgeryRecord');
const { getMedicalRecordsByType } = require('../medicalRecord.controller');
const BaseMedicalRecordController = require('../baseMedicalRecord.controller');

/**
 * Surgery Records Controller
 * Extends the base medical record controller
 */
class SurgeryRecordsController extends BaseMedicalRecordController {
  constructor() {
    super(SurgeryRecord, 'surgery-records');
  }
  
  /**
   * Get all surgery records for a patient with filtering and pagination
   * This reuses the common medical record controller functionality
   */
  getAllSurgeryRecords = (req, res, next) => {
    // Override the type parameter to be surgery-records
    req.params.type = 'surgery-records';
    return getMedicalRecordsByType(req, res, next);
  };
  
  /**
   * Add any surgery record-specific methods here
   */
}

// Create an instance of the controller
const surgeryRecordsController = new SurgeryRecordsController();

// Export controller methods
module.exports = {
  createSurgeryRecord: surgeryRecordsController.create,
  getSurgeryRecordsForConsultation: surgeryRecordsController.getForConsultation,
  getAllSurgeryRecords: surgeryRecordsController.getAllSurgeryRecords,
  updateSurgeryRecord: surgeryRecordsController.update,
  deleteSurgeryRecord: surgeryRecordsController.delete
}; 