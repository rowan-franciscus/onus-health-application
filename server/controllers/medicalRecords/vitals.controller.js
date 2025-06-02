const mongoose = require('mongoose');
const Vitals = require('../../models/VitalsRecord');
const { getMedicalRecordsByType } = require('../medicalRecord.controller');
const BaseMedicalRecordController = require('../baseMedicalRecord.controller');

/**
 * Vitals Record Controller
 * Extends the base medical record controller
 */
class VitalsController extends BaseMedicalRecordController {
  constructor() {
    super(Vitals, 'vitals');
  }
  
  /**
   * Get all vitals records for a patient with filtering and pagination
   * This reuses the common medical record controller functionality
   */
  getAllVitals = (req, res, next) => {
    // Override the type parameter to be vitals
    req.params.type = 'vitals';
    return getMedicalRecordsByType(req, res, next);
  };
  
  /**
   * Add any vitals-specific methods here
   */
}

// Create an instance of the controller
const vitalsController = new VitalsController();

// Export controller methods
module.exports = {
  createVitals: vitalsController.create,
  getVitalsForConsultation: vitalsController.getForConsultation,
  getAllVitals: vitalsController.getAllVitals,
  updateVitals: vitalsController.update,
  deleteVitals: vitalsController.delete
}; 