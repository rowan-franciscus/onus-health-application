/**
 * Medical Record Controller
 * Handles operations for all medical record types through a common interface
 */

const mongoose = require('mongoose');
const VitalsRecord = require('../models/VitalsRecord');
const MedicationRecord = require('../models/MedicationRecord');
const ImmunizationRecord = require('../models/ImmunizationRecord');
const LabResultRecord = require('../models/LabResultRecord');
const RadiologyReport = require('../models/RadiologyReport');
const HospitalRecord = require('../models/HospitalRecord');
const SurgeryRecord = require('../models/SurgeryRecord');

// Map of medical record types to their respective models
const MODEL_MAP = {
  'vitals': VitalsRecord,
  'medications': MedicationRecord,
  'immunizations': ImmunizationRecord,
  'lab-results': LabResultRecord,
  'radiology-reports': RadiologyReport,
  'hospital-records': HospitalRecord,
  'surgery-records': SurgeryRecord
};

/**
 * Get medical records of a specific type for a patient
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getMedicalRecordsByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { 
      patientId = req.user.role === 'patient' ? req.user._id : null,
      startDate, 
      endDate, 
      search, 
      sortBy = 'date', 
      sortOrder = 'desc', 
      limit = 20, 
      page = 1 
    } = req.query;

    // Validate patient access
    if (req.user.role === 'patient' && patientId && patientId !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to access this data' 
      });
    }

    // Validate provider access to patient data
    if (req.user.role === 'provider' && patientId) {
      // Logic to check if provider has connection to patient would go here
      // This is just a stub - implement actual connection check
    }

    // Get the appropriate model
    const Model = MODEL_MAP[type];
    if (!Model) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid medical record type' 
      });
    }

    // Build query
    const query = {};
    
    // Add patient filter
    if (patientId) {
      query.patient = mongoose.Types.ObjectId(patientId);
    }

    // Add date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Add search functionality
    if (search) {
      // This is a simplified example - implement field-specific search as needed
      const searchRegex = new RegExp(search, 'i');
      
      // For each model, search specific fields
      if (type === 'vitals') {
        query.$or = [
          { notes: searchRegex }
        ];
      } else if (type === 'medications') {
        query.$or = [
          { name: searchRegex },
          { notes: searchRegex }
        ];
      }
      // Add other model-specific search conditions as needed
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Create sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const records = await Model.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('patient', 'firstName lastName email')
      .populate('consultation', 'date provider');

    // Count total matching records
    const total = await Model.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        records,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get statistics for medical records
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getMedicalRecordStatistics = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { 
      patientId = req.user.role === 'patient' ? req.user._id : null,
      startDate, 
      endDate
    } = req.query;

    // Validate patient access
    if (req.user.role === 'patient' && patientId && patientId !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to access this data' 
      });
    }

    // Get the appropriate model
    const Model = MODEL_MAP[type];
    if (!Model) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid medical record type' 
      });
    }

    // Build query
    const query = {};
    
    // Add patient filter
    if (patientId) {
      query.patient = mongoose.Types.ObjectId(patientId);
    }

    // Add date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Statistics will vary based on medical record type
    let statistics = {};
    if (type === 'vitals') {
      // For vitals, get average values over time
      const results = await VitalsRecord.aggregate([
        { $match: query },
        { $group: {
            _id: null,
            avgHeartRate: { $avg: '$heartRate' },
            avgSystolic: { $avg: '$bloodPressure.systolic' },
            avgDiastolic: { $avg: '$bloodPressure.diastolic' },
            avgTemperature: { $avg: '$temperature' },
            avgWeight: { $avg: '$weight' },
            recordCount: { $sum: 1 }
          }
        }
      ]);

      statistics = results[0] || { recordCount: 0 };
    } else if (type === 'medications') {
      // For medications, count active vs completed
      const today = new Date();
      
      const activeCount = await MedicationRecord.countDocuments({
        ...query,
        $or: [
          { endDate: { $gte: today } },
          { endDate: null }
        ]
      });
      
      const completedCount = await MedicationRecord.countDocuments({
        ...query,
        endDate: { $lt: today }
      });
      
      statistics = {
        activeCount,
        completedCount,
        totalCount: activeCount + completedCount
      };
    }
    // Add other model-specific statistics as needed

    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent vitals for a patient
 */
exports.getPatientRecentVitals = async (req, res) => {
  try {
    const patientId = req.user.id;
    
    const vitals = await VitalsRecord.findOne({ patient: patientId })
      .sort({ date: -1 });
    
    return res.json({
      success: true,
      vitals: vitals ? {
        heartRate: vitals.heartRate?.value ? `${vitals.heartRate.value} ${vitals.heartRate.unit}` : 'N/A',
        bloodPressure: vitals.bloodPressure?.systolic ? 
          `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic} ${vitals.bloodPressure.unit}` : 'N/A',
        bodyTemperature: vitals.bodyTemperature?.value ? 
          `${vitals.bodyTemperature.value} ${vitals.bodyTemperature.unit}` : 'N/A',
        bloodGlucose: vitals.bloodGlucose?.value ? 
          `${vitals.bloodGlucose.value} ${vitals.bloodGlucose.unit}` : 'N/A',
        respiratoryRate: vitals.respiratoryRate?.value ? 
          `${vitals.respiratoryRate.value} ${vitals.respiratoryRate.unit}` : 'N/A',
        lastUpdated: vitals.date || vitals.createdAt
      } : null
    });
  } catch (error) {
    console.error('Error fetching recent vitals:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load recent vitals'
    });
  }
};

/**
 * Get vitals for a provider
 */
exports.getProviderVitals = async (req, res) => {
  try {
    const { patientId, limit = 10 } = req.query;
    const query = {};
    
    // If patientId is specified, filter by that patient
    if (patientId) {
      query.patient = patientId;
    }
    
    const vitals = await VitalsRecord.find(query)
      .populate('patient', 'firstName lastName')
      .sort({ date: -1 })
      .limit(parseInt(limit));
    
    return res.json({
      success: true,
      records: vitals,
      pagination: {
        total: vitals.length,
        page: 1,
        limit: parseInt(limit),
        pages: 1
      }
    });
  } catch (error) {
    console.error('Error fetching provider vitals:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load vitals'
    });
  }
};

/**
 * Get radiology reports
 */
exports.getRadiologyReports = async (req, res) => {
  try {
    const { patientId, limit = 10 } = req.query;
    const query = {};
    
    // If patientId is specified, filter by that patient
    if (patientId) {
      query.patient = patientId;
    }
    
    const reports = await RadiologyReport.find(query)
      .populate('patient', 'firstName lastName')
      .sort({ date: -1 })
      .limit(parseInt(limit));
    
    return res.json({
      success: true,
      records: reports,
      pagination: {
        total: reports.length,
        page: 1,
        limit: parseInt(limit),
        pages: 1
      }
    });
  } catch (error) {
    console.error('Error fetching radiology reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load radiology reports'
    });
  }
};

module.exports = exports; 