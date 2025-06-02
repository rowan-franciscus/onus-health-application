const mongoose = require('mongoose');
const Medication = require('../../models/MedicationRecord');
const { getMedicalRecordsByType } = require('../medicalRecord.controller');
const BaseMedicalRecordController = require('../baseMedicalRecord.controller');

/**
 * Medications Record Controller
 * Extends the base medical record controller
 */
class MedicationsController extends BaseMedicalRecordController {
  constructor() {
    super(Medication, 'medications');
  }
  
  /**
   * Get all medication records for a patient with filtering and pagination
   * This reuses the common medical record controller functionality
   */
  getAllMedications = (req, res, next) => {
    // Override the type parameter to be medications
    req.params.type = 'medications';
    return getMedicalRecordsByType(req, res, next);
  };
  
  /**
   * Add any medication-specific methods here
   */
}

// Create an instance of the controller
const medicationsController = new MedicationsController();

// Export controller methods
module.exports = {
  createMedication: medicationsController.create,
  getMedicationsForConsultation: medicationsController.getForConsultation,
  getAllMedications: medicationsController.getAllMedications,
  updateMedication: medicationsController.update,
  deleteMedication: medicationsController.delete
}; 