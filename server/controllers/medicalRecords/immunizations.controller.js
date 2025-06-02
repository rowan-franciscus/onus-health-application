const mongoose = require('mongoose');
const Immunization = require('../../models/ImmunizationRecord');
const { getMedicalRecordsByType } = require('../medicalRecord.controller');
const BaseMedicalRecordController = require('../baseMedicalRecord.controller');

/**
 * Immunizations Record Controller
 * Extends the base medical record controller
 */
class ImmunizationsController extends BaseMedicalRecordController {
  constructor() {
    super(Immunization, 'immunizations');
  }
  
  /**
   * Get all immunization records for a patient with filtering and pagination
   * This reuses the common medical record controller functionality
   */
  getAllImmunizations = (req, res, next) => {
    // Override the type parameter to be immunizations
    req.params.type = 'immunizations';
    return getMedicalRecordsByType(req, res, next);
  };
  
  /**
   * Add any immunization-specific methods here
   */
}

// Create an instance of the controller
const immunizationsController = new ImmunizationsController();

// Export controller methods
module.exports = {
  createImmunization: immunizationsController.create,
  getImmunizationsForConsultation: immunizationsController.getForConsultation,
  getAllImmunizations: immunizationsController.getAllImmunizations,
  updateImmunization: immunizationsController.update,
  deleteImmunization: immunizationsController.delete
}; 