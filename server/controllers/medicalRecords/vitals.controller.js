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
   * Create vitals record by patient
   * Allows patients to add their own vitals records
   */
  createPatientVitals = async (req, res) => {
    try {
      const patientId = req.user.id;
      
      // Create record with patient as creator
      const vitalsRecord = new Vitals({
        ...req.body,
        patient: patientId,
        provider: null, // No provider for patient-created records
        consultation: null, // No consultation for patient-created records
        createdByPatient: true, // Mark as patient-created
        date: req.body.date || new Date()
      });
      
      await vitalsRecord.save();
      
      // Populate patient info before sending response
      await vitalsRecord.populate('patient', 'firstName lastName');
      
      return res.status(201).json({
        success: true,
        record: vitalsRecord
      });
    } catch (error) {
      console.error('Error creating patient vitals record:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to create vitals record', 
        error: error.message 
      });
    }
  };

  /**
   * Get a single vitals record by ID
   * Allows patients to view individual vitals records
   */
  getVitalsById = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Find the vitals record
      const vitalsRecord = await Vitals.findById(id)
        .populate('patient', 'firstName lastName email')
        .populate('provider', 'firstName lastName email');
      
      if (!vitalsRecord) {
        return res.status(404).json({ 
          success: false,
          message: 'Vitals record not found' 
        });
      }
      
      // Check permissions
      if (userRole === 'patient' && vitalsRecord.patient._id.toString() !== userId) {
        return res.status(403).json({ 
          success: false,
          message: 'Unauthorized to access this vitals record' 
        });
      }
      
      if (userRole === 'provider' && vitalsRecord.provider && vitalsRecord.provider._id.toString() !== userId) {
        return res.status(403).json({ 
          success: false,
          message: 'Unauthorized to access this vitals record' 
        });
      }
      
      return res.json({
        success: true,
        record: vitalsRecord
      });
    } catch (error) {
      console.error('Error fetching vitals record:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to fetch vitals record', 
        error: error.message 
      });
    }
  };
}

// Create an instance of the controller
const vitalsController = new VitalsController();

// Export controller methods
module.exports = {
  createVitals: vitalsController.create,
  getVitalsForConsultation: vitalsController.getForConsultation,
  getAllVitals: vitalsController.getAllVitals,
  updateVitals: vitalsController.update,
  deleteVitals: vitalsController.delete,
  createPatientVitals: vitalsController.createPatientVitals,
  getVitalsById: vitalsController.getVitalsById
}; 