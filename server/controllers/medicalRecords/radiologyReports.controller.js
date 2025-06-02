const mongoose = require('mongoose');
const RadiologyReport = require('../../models/RadiologyReport');
const { getMedicalRecordsByType } = require('../medicalRecord.controller');
const BaseMedicalRecordController = require('../baseMedicalRecord.controller');

/**
 * Radiology Reports Controller
 * Extends the base medical record controller
 */
class RadiologyReportsController extends BaseMedicalRecordController {
  constructor() {
    super(RadiologyReport, 'radiology-reports');
  }
  
  /**
   * Get all radiology report records for a patient with filtering and pagination
   * This reuses the common medical record controller functionality
   */
  getAllRadiologyReports = (req, res, next) => {
    // Override the type parameter to be radiology-reports
    req.params.type = 'radiology-reports';
    return getMedicalRecordsByType(req, res, next);
  };
  
  /**
   * Add any radiology report-specific methods here
   */
}

// Create an instance of the controller
const radiologyReportsController = new RadiologyReportsController();

// Export controller methods
module.exports = {
  createRadiologyReport: radiologyReportsController.create,
  getRadiologyReportsForConsultation: radiologyReportsController.getForConsultation,
  getAllRadiologyReports: radiologyReportsController.getAllRadiologyReports,
  updateRadiologyReport: radiologyReportsController.update,
  deleteRadiologyReport: radiologyReportsController.delete
}; 