const mongoose = require('mongoose');
const LabResult = require('../../models/LabResultRecord');
const { getMedicalRecordsByType } = require('../medicalRecord.controller');
const BaseMedicalRecordController = require('../baseMedicalRecord.controller');

/**
 * Lab Results Record Controller
 * Extends the base medical record controller
 */
class LabResultsController extends BaseMedicalRecordController {
  constructor() {
    super(LabResult, 'lab-results');
  }
  
  /**
   * Get all lab result records for a patient with filtering and pagination
   * This reuses the common medical record controller functionality
   */
  getAllLabResults = (req, res, next) => {
    // Override the type parameter to be lab-results
    req.params.type = 'lab-results';
    return getMedicalRecordsByType(req, res, next);
  };
  
  /**
   * Add any lab result-specific methods here
   */
}

// Create an instance of the controller
const labResultsController = new LabResultsController();

// Export controller methods
module.exports = {
  createLabResult: labResultsController.create,
  getLabResultsForConsultation: labResultsController.getForConsultation,
  getAllLabResults: labResultsController.getAllLabResults,
  updateLabResult: labResultsController.update,
  deleteLabResult: labResultsController.delete
}; 