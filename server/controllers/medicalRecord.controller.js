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
      patientId,
      startDate, 
      endDate, 
      search, 
      sortBy = 'date', 
      sortOrder = 'desc', 
      limit = 20, 
      page = 1 
    } = req.query;

    // Get the appropriate model
    const Model = MODEL_MAP[type];
    if (!Model) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid medical record type' 
      });
    }

    // Build query based on user role
    const query = {};
    
    if (req.user.role === 'patient') {
      // Patients can only view their own records
      query.patient = req.user._id;
      
      // Validate patient access
      if (patientId && patientId !== req.user._id.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'You are not authorized to access this data' 
        });
      }
    } else if (req.user.role === 'provider') {
      // Check if provider is viewing a specific patient's records
      if (patientId) {
        // Check provider's access level to this patient
        const Connection = require('../models/Connection');
        const connection = await Connection.findOne({
          provider: req.user._id,
          patient: patientId
        });
        
        if (!connection) {
          return res.status(403).json({ 
            success: false, 
            message: 'No connection to this patient' 
          });
        }
        
        // If provider has full approved access, they can see all records
        if (connection.accessLevel === 'full' && connection.fullAccessStatus === 'approved') {
          query.patient = mongoose.Types.ObjectId(patientId);
        } else {
          // Limited access - only see records they created
          query.patient = mongoose.Types.ObjectId(patientId);
          query.provider = req.user._id;
        }
      } else {
        // If no patient specified, show all records created by this provider
        query.provider = req.user._id;
      }
    } else if (req.user.role === 'admin') {
      // Admins can filter by patient and provider
      if (patientId) query.patient = mongoose.Types.ObjectId(patientId);
      if (req.query.providerId) query.provider = mongoose.Types.ObjectId(req.query.providerId);
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
      .populate('provider', 'firstName lastName email')
      .populate('consultation', 'date _id general.specialistName general.specialty');

    // Count total matching records
    const total = await Model.countDocuments(query);

    // For providers, check if they have active connections to each patient
    let recordsWithAccess = records;
    if (req.user.role === 'provider') {
      const Connection = require('../models/Connection');
      const patientIds = [...new Set(records.map(record => record.patient._id.toString()))];
      
      // Find all active connections for this provider with the patients in the records
      const connections = await Connection.find({
        provider: req.user._id,
        patient: { $in: patientIds }
      });
      
      // Create a map of patient IDs to connection status
      const connectionMap = {};
      connections.forEach(conn => {
        connectionMap[conn.patient.toString()] = true;
      });
      
      // Add hasAccess field to each record
      recordsWithAccess = records.map(record => ({
        ...record.toObject(),
        hasAccess: connectionMap[record.patient._id.toString()] || false
      }));
    }

    res.status(200).json({
      success: true,
      records: recordsWithAccess,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getMedicalRecordsByType:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
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
    const providerId = req.user._id;
    
    let query = {};
    
    // If patientId is specified, check provider's access level
    if (patientId) {
      const Connection = require('../models/Connection');
      const connection = await Connection.findOne({
        provider: providerId,
        patient: new mongoose.Types.ObjectId(patientId)
      });
      
      if (!connection) {
        return res.status(403).json({ 
          success: false, 
          message: 'No connection to this patient' 
        });
      }
      
      // If provider has full approved access, they can see all vitals for this patient
      if (connection.accessLevel === 'full' && connection.fullAccessStatus === 'approved') {
        query.patient = new mongoose.Types.ObjectId(patientId);
      } else {
        // Limited access - only see vitals they created for this patient
        query.patient = new mongoose.Types.ObjectId(patientId);
        query.provider = providerId;
      }
    } else {
      // If no patient specified, show all vitals created by this provider
      query.provider = providerId;
    }
    
    console.log('Provider vitals query:', query);
    
    const vitals = await VitalsRecord.find(query)
      .populate('patient', 'firstName lastName')
      .populate('provider', 'firstName lastName email')
      .populate('consultation', 'date _id general.specialistName general.specialty')
      .sort({ date: -1 })
      .limit(parseInt(limit));
    
    console.log(`Found ${vitals.length} vitals records`);
    
    // Check if provider has active connections to each patient
    const patientIds = [...new Set(vitals.map(record => record.patient._id.toString()))];
    
    // Find all active connections for this provider with the patients in the records
    const connections = await Connection.find({
      provider: providerId,
      patient: { $in: patientIds }
    });
    
    // Create a map of patient IDs to connection status
    const connectionMap = {};
    connections.forEach(conn => {
      connectionMap[conn.patient.toString()] = true;
    });
    
    // Add hasAccess field to each record
    const vitalsWithAccess = vitals.map(record => ({
      ...record.toObject(),
      hasAccess: connectionMap[record.patient._id.toString()] || false
    }));
    
    return res.json({
      success: true,
      records: vitalsWithAccess,
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
    
    // Build query based on user role for proper access control
    const query = {};
    
    if (req.user.role === 'provider') {
      // Providers can only see their own radiology reports
      query.provider = req.user._id;
    } else if (req.user.role === 'patient') {
      // Patients can only see their own records
      query.patient = req.user._id;
    }
    // Admins can see all records (no additional filtering)
    
    // If patientId is specified, filter by that patient (for admins/providers with access)
    if (patientId) {
      if (req.user.role === 'provider') {
        // Provider can filter by patient they have access to
        query.patient = mongoose.Types.ObjectId(patientId);
      } else if (req.user.role === 'patient' && patientId !== req.user._id.toString()) {
        // Patients can't access other patients' records
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to access this data'
        });
      }
    }
    
    console.log('Radiology reports query:', query);
    
    const reports = await RadiologyReport.find(query)
      .populate('patient', 'firstName lastName')
      .populate('provider', 'firstName lastName email')
      .populate('consultation', 'date _id general.specialistName general.specialty')
      .sort({ date: -1 })
      .limit(parseInt(limit));
    
    console.log(`Found ${reports.length} radiology reports for user ${req.user._id} (${req.user.role})`);
    
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