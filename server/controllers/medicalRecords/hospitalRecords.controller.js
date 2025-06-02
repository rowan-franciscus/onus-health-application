const mongoose = require('mongoose');
const HospitalRecord = require('../../models/HospitalRecord');
const Consultation = require('../../models/Consultation');
const { getMedicalRecordsByType } = require('../medicalRecord.controller');
const BaseMedicalRecordController = require('../baseMedicalRecord.controller');

/**
 * Hospital Records Controller
 * Extends the base medical record controller
 */
class HospitalRecordsController extends BaseMedicalRecordController {
  constructor() {
    super(HospitalRecord, 'hospital-records');
  }
  
  /**
   * Get all hospital records for a patient with filtering and pagination
   * This reuses the common medical record controller functionality
   */
  getAllHospitalRecords = (req, res, next) => {
    // Override the type parameter to be hospital-records
    req.params.type = 'hospital-records';
    return getMedicalRecordsByType(req, res, next);
  };
  
  /**
   * Create a new hospital record
   */
  createHospitalRecord = async (req, res) => {
    try {
      const { consultationId } = req.params;
      const providerId = req.user.id;
      
      // Validate consultation exists and belongs to the provider
      const consultation = await Consultation.findOne({
        _id: consultationId,
        provider: providerId
      });
      
      if (!consultation) {
        return res.status(404).json({ message: 'Consultation not found or unauthorized' });
      }
      
      // Create hospital record
      const hospitalRecord = new HospitalRecord({
        ...req.body,
        consultation: consultationId,
        provider: providerId,
        patient: consultation.patient
      });
      
      await hospitalRecord.save();
      
      // Update consultation's lastUpdated timestamp
      consultation.lastUpdated = Date.now();
      await consultation.save();
      
      return res.status(201).json(hospitalRecord);
    } catch (error) {
      console.error('Error creating hospital record:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  /**
   * Get hospital records for a consultation
   */
  getHospitalRecordsForConsultation = async (req, res) => {
    try {
      const { consultationId } = req.params;
      const userId = req.user.id;
      
      // First check if user has access to this consultation
      const consultation = await Consultation.findById(consultationId);
      
      if (!consultation) {
        return res.status(404).json({ message: 'Consultation not found' });
      }
      
      // Verify user is either the patient or provider for this consultation
      if (consultation.patient.toString() !== userId && 
          consultation.provider.toString() !== userId) {
        return res.status(403).json({ message: 'Unauthorized to access this consultation' });
      }
      
      // Find hospital records
      const hospitalRecords = await HospitalRecord.find({ consultation: consultationId })
        .sort({ admissionDate: -1 });
      
      return res.json(hospitalRecords);
    } catch (error) {
      console.error('Error fetching hospital records:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  /**
   * Update hospital record
   */
  updateHospitalRecord = async (req, res) => {
    try {
      const { id } = req.params;
      const providerId = req.user.id;
      
      // Find hospital record and check if provider is authorized
      const hospitalRecord = await HospitalRecord.findOne({
        _id: id,
        provider: providerId
      });
      
      if (!hospitalRecord) {
        return res.status(404).json({ message: 'Hospital record not found or unauthorized' });
      }
      
      // Update fields
      Object.keys(req.body).forEach(key => {
        hospitalRecord[key] = req.body[key];
      });
      
      hospitalRecord.updatedAt = Date.now();
      await hospitalRecord.save();
      
      // Update consultation's lastUpdated timestamp
      await Consultation.findByIdAndUpdate(
        hospitalRecord.consultation,
        { lastUpdated: Date.now() }
      );
      
      return res.json(hospitalRecord);
    } catch (error) {
      console.error('Error updating hospital record:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  /**
   * Delete hospital record
   */
  deleteHospitalRecord = async (req, res) => {
    try {
      const { id } = req.params;
      const providerId = req.user.id;
      
      // Find hospital record and check if provider is authorized
      const hospitalRecord = await HospitalRecord.findOne({
        _id: id,
        provider: providerId
      });
      
      if (!hospitalRecord) {
        return res.status(404).json({ message: 'Hospital record not found or unauthorized' });
      }
      
      // Store consultation ID before deleting
      const consultationId = hospitalRecord.consultation;
      
      // Delete hospital record
      await hospitalRecord.remove();
      
      // Update consultation's lastUpdated timestamp
      await Consultation.findByIdAndUpdate(
        consultationId,
        { lastUpdated: Date.now() }
      );
      
      return res.json({ message: 'Hospital record deleted successfully' });
    } catch (error) {
      console.error('Error deleting hospital record:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
}

// Create an instance of the controller
const hospitalRecordsController = new HospitalRecordsController();

// Export controller methods
module.exports = {
  createHospitalRecord: hospitalRecordsController.create,
  getHospitalRecordsForConsultation: hospitalRecordsController.getForConsultation,
  getAllHospitalRecords: hospitalRecordsController.getAllHospitalRecords,
  updateHospitalRecord: hospitalRecordsController.update,
  deleteHospitalRecord: hospitalRecordsController.delete
}; 