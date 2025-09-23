/**
 * Base Medical Record Controller
 * Provides common functionality for all medical record types
 */

const mongoose = require('mongoose');
const Consultation = require('../models/Consultation');
const Connection = require('../models/Connection');

/**
 * Base controller class with common CRUD methods for medical records
 */
class BaseMedicalRecordController {
  constructor(Model, recordType) {
    this.Model = Model;
    this.recordType = recordType;
  }

  /**
   * Create a new medical record
   */
  create = async (req, res) => {
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
      
      // Create record
      const record = new this.Model({
        ...req.body,
        consultation: consultationId,
        provider: providerId,
        patient: consultation.patient
      });
      
      await record.save();
      
      // Update consultation's lastUpdated timestamp
      consultation.lastUpdated = Date.now();
      await consultation.save();
      
      return res.status(201).json(record);
    } catch (error) {
      console.error(`Error creating ${this.recordType} record:`, error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  /**
   * Get records for a consultation
   */
  getForConsultation = async (req, res) => {
    try {
      const { consultationId } = req.params;
      const userId = req.user.id;
      
      // First check if user has access to this consultation
      const consultation = await Consultation.findById(consultationId);
      
      if (!consultation) {
        return res.status(404).json({ message: 'Consultation not found' });
      }
      
      // Verify user has access to this consultation
      const userRole = req.user.role;
      
      if (userRole === 'patient' && consultation.patient.toString() !== userId) {
        return res.status(403).json({ message: 'Unauthorized to access this consultation' });
      }
      
      if (userRole === 'provider') {
        const isCreator = consultation.provider.toString() === userId;
        
        if (!isCreator) {
          // Check if provider has full access to this patient
          const connection = await Connection.findOne({
            provider: userId,
            patient: consultation.patient
          });
          
          if (!connection || 
              !(connection.accessLevel === 'full' && connection.fullAccessStatus === 'approved')) {
            return res.status(403).json({ message: 'Unauthorized to access this consultation' });
          }
        }
      }
      
      // Find records
      const records = await this.Model.find({ consultation: consultationId })
        .sort({ createdAt: -1 });
      
      return res.json(records);
    } catch (error) {
      console.error(`Error fetching ${this.recordType} records:`, error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  /**
   * Update a record
   */
  update = async (req, res) => {
    try {
      const { id } = req.params;
      const providerId = req.user.id;
      
      // Find record and check if provider is authorized
      const record = await this.Model.findOne({
        _id: id,
        provider: providerId
      });
      
      if (!record) {
        return res.status(404).json({ message: `${this.recordType} record not found or unauthorized` });
      }
      
      // Update fields
      Object.keys(req.body).forEach(key => {
        record[key] = req.body[key];
      });
      
      record.updatedAt = Date.now();
      await record.save();
      
      // Update consultation's lastUpdated timestamp
      await Consultation.findByIdAndUpdate(
        record.consultation,
        { lastUpdated: Date.now() }
      );
      
      return res.json(record);
    } catch (error) {
      console.error(`Error updating ${this.recordType} record:`, error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  /**
   * Delete a record
   */
  delete = async (req, res) => {
    try {
      const { id } = req.params;
      const providerId = req.user.id;
      
      // Find record and check if provider is authorized
      const record = await this.Model.findOne({
        _id: id,
        provider: providerId
      });
      
      if (!record) {
        return res.status(404).json({ message: `${this.recordType} record not found or unauthorized` });
      }
      
      // Store consultation ID before deleting
      const consultationId = record.consultation;
      
      // Delete record
      await record.remove();
      
      // Update consultation's lastUpdated timestamp
      await Consultation.findByIdAndUpdate(
        consultationId,
        { lastUpdated: Date.now() }
      );
      
      return res.json({ message: `${this.recordType} record deleted successfully` });
    } catch (error) {
      console.error(`Error deleting ${this.recordType} record:`, error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
}

module.exports = BaseMedicalRecordController; 