const mongoose = require('mongoose');
const Consultation = require('../models/Consultation');
const User = require('../models/User');
const Connection = require('../models/Connection');
const fs = require('fs');
const path = require('path');
const config = require('../config/environment');
const { formatDate } = require('../utils/dateUtils');

const EmailQueue = require('../models/EmailQueue');

// Import medical record models
const VitalsRecord = require('../models/VitalsRecord');
const MedicationRecord = require('../models/MedicationRecord');
// Immunization, Hospital, and Surgery records are now standalone (not part of consultations).
const LabResultRecord = require('../models/LabResultRecord');
const RadiologyReport = require('../models/RadiologyReport');

/**
 * Get all consultations with filtering
 */
exports.getAllConsultations = async (req, res) => {
  try {
    const { patient, provider, status, startDate, endDate } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Build query based on user role and filters
    const query = {};
    
    // Filter based on user role
    if (userRole === 'patient') {
      // Patients can only view their own consultations
      query.patient = userId;
      // Patients should only see completed consultations unless explicitly filtering
      if (!status) {
        query.status = 'completed';
      }
    } else if (userRole === 'provider') {
      // Check if provider is viewing a specific patient's consultations
      if (patient) {
        // Check provider's access level to this patient
        const connection = await Connection.findOne({
          provider: userId,
          patient: patient
        });
        
        if (!connection) {
          return res.status(403).json({ 
            success: false, 
            message: 'No connection to this patient' 
          });
        }
        
        // If provider has full approved access, they can see all consultations
        if (connection.accessLevel === 'full' && connection.fullAccessStatus === 'approved') {
          query.patient = patient;
        } else {
          // Limited access - only see consultations they created
          query.patient = patient;
          query.provider = userId;
        }
      } else {
        // If no patient specified, show all consultations created by this provider
        query.provider = userId;
      }
    } else if (userRole === 'admin') {
      // Admins can filter by patient and provider
      if (patient) query.patient = patient;
      if (provider) query.provider = provider;
    }
    
    // Apply other filters
    if (status) query.status = status;
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    // For provider and admin roles, filter to root consultations only when explicitly
    // requested (e.g. the consultation list table). Callers like ViewPatient that need
    // all entries (including follow-ups) for medical record extraction omit this flag.
    if ((userRole === 'provider' || userRole === 'admin') && req.query.rootsOnly === 'true') {
      query.parentConsultation = null;
    }

    // Get consultations with populated patient/provider and medical records
    const consultations = await Consultation.find(query)
      .populate('patient', 'firstName lastName email profileImage patientProfile')
      .populate('provider', 'firstName lastName email')
      .populate('vitals')
      .populate('medications')
      .populate('labResults')
      .populate('radiologyReports')
      .sort({ createdAt: -1 });

    // Attach visitCount (root + follow-ups) for provider/admin views
    if (userRole === 'provider' || userRole === 'admin') {
      const consultationIds = consultations.map(c => c._id);
      const followUpStats = await Consultation.aggregate([
        { $match: { parentConsultation: { $in: consultationIds } } },
        { $group: { _id: '$parentConsultation', count: { $sum: 1 }, latestDate: { $max: '$date' } } }
      ]);
      const countMap = {};
      const latestDateMap = {};
      followUpStats.forEach(({ _id, count, latestDate }) => {
        countMap[_id.toString()] = count;
        latestDateMap[_id.toString()] = latestDate;
      });

      const result = consultations.map(c => {
        const obj = c.toObject({ virtuals: true });
        const key = c._id.toString();
        obj.visitCount = 1 + (countMap[key] || 0);
        // Surface the most recent thread entry date as the consultation's "last visit".
        const latestFollowUp = latestDateMap[key];
        if (latestFollowUp && (!obj.date || new Date(latestFollowUp) > new Date(obj.date))) {
          obj.date = latestFollowUp;
        }
        return obj;
      });
      return res.json(result);
    }

    return res.json(consultations);
  } catch (error) {
    console.error('Error fetching consultations:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get a specific consultation by ID
 */
exports.getConsultationById = async (req, res) => {
  console.log('=== consultationController.getConsultationById called ===');
  console.log('Request user:', req.user ? { id: req.user.id, role: req.user.role, email: req.user.email } : 'No user');
  
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Find consultation with populated patient/provider and medical records
    const consultation = await Consultation.findById(id)
      .populate('patient', 'firstName lastName email profileImage patientProfile')
      .populate('provider', 'firstName lastName email')
      .populate('vitals')
      .populate('medications')
      .populate('labResults')
      .populate('radiologyReports');
    
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }
    
    // Debug logging
    console.log('Auth check - User ID:', userId);
    console.log('Auth check - User Role:', userRole);
    console.log('Auth check - Consultation Patient ID:', consultation.patient._id.toString());
    console.log('Auth check - Consultation Provider ID:', consultation.provider._id.toString());
    
    // Check user permissions
    if (userRole === 'patient' && consultation.patient._id.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized to access this consultation' });
    }
    
    // For providers, check if they created the consultation OR have full access to the patient
    if (userRole === 'provider') {
      const isCreator = consultation.provider._id.toString() === userId;
      
      if (!isCreator) {
        // Check if provider has full access to this patient
        const connection = await Connection.findOne({
          provider: userId,
          patient: consultation.patient._id
        });
        
        console.log('Connection check:', {
          connection: connection ? 'found' : 'not found',
          accessLevel: connection?.accessLevel,
          fullAccessStatus: connection?.fullAccessStatus
        });
        
        if (!connection || 
            !(connection.accessLevel === 'full' && connection.fullAccessStatus === 'approved')) {
          return res.status(403).json({ message: 'Unauthorized to access this consultation' });
        }
      }
    }
    
    // Additional check: Patients should only see completed consultations
    if (userRole === 'patient' && consultation.status !== 'completed') {
      return res.status(403).json({ message: 'Consultation not available for viewing' });
    }

    // When raw=true (e.g. edit forms), skip root resolution and return this document directly
    if (req.query.raw === 'true') {
      const obj = consultation.toObject({ virtuals: true });
      obj.thread = [];
      obj.visitCount = 1;
      return res.json(obj);
    }

    // Resolve to root consultation if this is a follow-up
    let rootConsultation = consultation;
    if (consultation.parentConsultation) {
      rootConsultation = await Consultation.findById(consultation.parentConsultation)
        .populate('patient', 'firstName lastName email profileImage patientProfile')
        .populate('provider', 'firstName lastName email')
        .populate('vitals')
        .populate('medications')
        .populate('labResults')
        .populate('radiologyReports');
      if (!rootConsultation) {
        return res.status(404).json({ message: 'Root consultation not found' });
      }
    }

    // Fetch the thread (all follow-ups for this root, sorted chronologically)
    const threadQuery = { parentConsultation: rootConsultation._id };
    // Patients may only see completed entries
    if (req.user.role === 'patient') threadQuery.status = 'completed';

    const followUps = await Consultation.find(threadQuery)
      .populate('patient', 'firstName lastName email profileImage patientProfile')
      .populate('provider', 'firstName lastName email')
      .populate('vitals')
      .populate('medications')
      .populate('labResults')
      .populate('radiologyReports')
      .sort({ date: 1, createdAt: 1 });

    const rootObj = rootConsultation.toObject({ virtuals: true });
    rootObj.thread = followUps.map(f => f.toObject({ virtuals: true }));
    rootObj.visitCount = 1 + followUps.length;

    return res.json(rootObj);
  } catch (error) {
    console.error('Error fetching consultation:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Create a new consultation
 */
exports.createConsultation = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    console.log('=== CONSULTATION CREATION DEBUG START ===');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request user:', { id: req.user.id, role: req.user.role, email: req.user.email });
    
    const providerId = req.user.id;
    const { patient, patientEmail, vitals, medication, labResults, radiology, ...consultationData } = req.body;
    // Note: immunization, hospital, and surgery are intentionally NOT destructured here.
    // They are standalone records and any leftover values in req.body are ignored.
    delete consultationData.immunization;
    delete consultationData.hospital;
    delete consultationData.surgery;

    console.log('Extracted data:', {
      patient,
      patientEmail,
      consultationDataKeys: Object.keys(consultationData),
      vitalsExists: !!vitals,
      medicationLength: medication?.length,
      labResultsLength: labResults?.length,
      radiologyLength: radiology?.length
    });
    
    let patientId = patient;
    let patientUser;
    
    console.log('=== PATIENT LOOKUP ===');
    // If patientEmail is provided instead of patient ID, find the patient by email
    if (!patientId && patientEmail) {
      console.log('Looking up patient by email:', patientEmail);
      patientUser = await User.findOne({ email: patientEmail, role: 'patient' });
      if (!patientUser) {
        console.log('Patient not found by email');
        await session.abortTransaction();
        return res.status(404).json({ message: 'Patient not found' });
      }
      patientId = patientUser._id;
      console.log('Patient found by email:', patientUser._id);
    } else {
      console.log('Looking up patient by ID:', patientId);
      // Check if patient exists
      patientUser = await User.findOne({ _id: patientId, role: 'patient' });
      if (!patientUser) {
        console.log('Patient not found by ID');
        await session.abortTransaction();
        return res.status(404).json({ message: 'Patient not found' });
      }
      console.log('Patient found by ID:', patientUser._id);
    }
    
    console.log('=== CONNECTION CHECK ===');
    // Check if connection exists, if not create one with limited access
    let connection = await Connection.findOne({
      patient: patientId,
      provider: providerId
    }).session(session);
    
    if (!connection) {
      console.log('Creating new connection');
      // Create new connection with limited access
      connection = new Connection({
        patient: patientId,
        provider: providerId,
        initiatedBy: providerId,
        accessLevel: 'limited',
        fullAccessStatus: 'none',
        patientNotified: false
      });
      
      await connection.save({ session });
      console.log('Connection created successfully');
      
      // Queue email notification to patient about new connection
      const provider = await User.findById(providerId);
      try {
        await EmailQueue.create([{
          to: patientUser.email,
          from: config.emailFrom || 'noreply@onushealth.com',
          subject: 'New Healthcare Provider Connection',
          html: `<p>Dear ${patientUser.firstName},</p><p>Your healthcare provider ${provider.firstName} ${provider.lastName} has connected with you on Onus Health and created a new consultation.</p><p>This provider currently has limited access to your medical records (they can only see consultations and records they create for you).</p><p>Please log in to your account to view the consultation and manage provider access.</p>`,
          template: 'newConnection',
          templateData: {
            patientName: `${patientUser.firstName} ${patientUser.lastName}`,
            providerName: `${provider.firstName} ${provider.lastName}`,
            providerSpecialty: provider.providerProfile?.specialty || 'Healthcare Provider',
            accessLevel: 'limited'
          },
          userId: patientUser._id
        }], { session });
        console.log('Email queue created successfully');
      } catch (emailError) {
        console.error('Error creating email queue:', emailError);
        // Don't fail for email errors
      }
      
      // Mark as notified
      connection.patientNotified = true;
      connection.patientNotifiedAt = Date.now();
      await connection.save({ session });
      console.log('Connection updated with notification status');
    } else {
      console.log('Existing connection found:', connection._id);
    }
    
    console.log('=== CONSULTATION CREATION ===');
    console.log('Consultation data before creation:', consultationData);
    
    // Create new consultation
    const consultation = new Consultation({
      patient: patientId,
      provider: providerId,
      ...consultationData,
      status: consultationData.status || 'draft',
      attachments: [] // Explicitly initialize attachments array
    });
    
    console.log('Consultation object created, about to save...');
    await consultation.save({ session });
    console.log('Consultation saved successfully:', consultation._id);
    
    console.log('=== MEDICAL RECORDS CREATION ===');
    // Now create the individual medical records if data is provided
    // Save Vitals if provided and has data
    if (vitals && Object.values(vitals).some(val => val && (typeof val === 'object' ? val.value : val))) {
      console.log('Creating vitals record:', vitals);
      try {
        const vitalsRecord = new VitalsRecord({
          patient: patientId,
          provider: providerId,
          consultation: consultation._id,
          date: consultation.date,
          ...vitals
        });
        await vitalsRecord.save({ session });
        console.log('Vitals record created:', vitalsRecord._id);
        
        // Update consultation with vitals reference
        consultation.vitals = vitalsRecord._id;
      } catch (vitalsError) {
        console.error('Error creating vitals record:', vitalsError);
        throw vitalsError;
      }
    } else {
      console.log('No vitals data to save');
    }
    
    // Save Medications if provided
    if (medication && Array.isArray(medication) && medication.length > 0) {
      console.log('Creating medication records:', medication.length);
      try {
        const medicationRecords = await Promise.all(
          medication.map(async (med, index) => {
            console.log(`Creating medication ${index + 1}:`, med);
            const medicationRecord = new MedicationRecord({
              patient: patientId,
              provider: providerId,
              consultation: consultation._id,
              date: consultation.date,
              ...med
            });
            await medicationRecord.save({ session });
            return medicationRecord._id;
          })
        );
        
        // Update consultation with medication references
        consultation.medications = medicationRecords;
        console.log('All medication records created successfully');
      } catch (medicationError) {
        console.error('Error creating medication records:', medicationError);
        throw medicationError;
      }
    } else {
      console.log('No medication data to save');
    }
    
    // Save Lab Results if provided
    if (labResults && Array.isArray(labResults) && labResults.length > 0) {
      console.log('Creating lab result records:', labResults.length);
      try {
        const labResultRecords = await Promise.all(
          labResults.map(async (lab, index) => {
            console.log(`Creating lab result ${index + 1}:`, lab);
            const labResultRecord = new LabResultRecord({
              patient: patientId,
              provider: providerId,
              consultation: consultation._id,
              date: consultation.date,
              ...lab
            });
            await labResultRecord.save({ session });
            return labResultRecord._id;
          })
        );
        
        // Update consultation with lab result references
        consultation.labResults = labResultRecords;
        console.log('All lab result records created successfully');
      } catch (labError) {
        console.error('Error creating lab result records:', labError);
        throw labError;
      }
    } else {
      console.log('No lab results data to save');
    }
    
    // Save Radiology Reports if provided
    if (radiology && Array.isArray(radiology) && radiology.length > 0) {
      console.log('Creating radiology records:', radiology.length);
      try {
        const radiologyRecords = await Promise.all(
          radiology.map(async (rad, index) => {
            console.log(`Creating radiology ${index + 1}:`, rad);
            const radiologyRecord = new RadiologyReport({
              patient: patientId,
              provider: providerId,
              consultation: consultation._id,
              date: consultation.date,
              ...rad
            });
            await radiologyRecord.save({ session });
            return radiologyRecord._id;
          })
        );
        
        // Update consultation with radiology references
        consultation.radiologyReports = radiologyRecords;
        console.log('All radiology records created successfully');
      } catch (radiologyError) {
        console.error('Error creating radiology records:', radiologyError);
        throw radiologyError;
      }
    } else {
      console.log('No radiology data to save');
    }
    
    console.log('=== FINAL CONSULTATION SAVE ===');
    // Save the updated consultation with all the references
    await consultation.save({ session });
    console.log('Final consultation save successful');
    
    console.log('=== TRANSACTION COMMIT ===');
    // Commit the transaction
    await session.commitTransaction();
    console.log('Transaction committed successfully');
    
    // Handle post-transaction operations
    try {
      console.log('=== POST-TRANSACTION EMAIL QUEUE ===');
      // Import email service
      const emailService = require('../services/email.service');
      
      // Send email notification to patient about new consultation
      await emailService.sendTemplateEmail(
        patientUser.email,
        'consultationNotification',
        {
          patientName: `${patientUser.firstName} ${patientUser.lastName}`,
          providerName: `${req.user.firstName} ${req.user.lastName}`,
          consultationDate: formatDate(new Date()),
          consultationId: consultation._id
        },
        {
          subject: 'New Medical Consultation',
          userId: patientUser._id,
          queue: true
        }
      );
      console.log('Post-transaction email notification sent');
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't fail the whole operation if email fails
    }
    
    console.log('=== CONSULTATION POPULATION ===');
    // Populate the consultation before sending response
    const populatedConsultation = await Consultation.findById(consultation._id)
      .populate('patient', 'firstName lastName email profileImage patientProfile')
      .populate('provider', 'firstName lastName email')
      .populate('vitals')
      .populate('medications')
      .populate('labResults')
      .populate('radiologyReports');
    
    console.log('Consultation populated successfully');
    console.log('=== CONSULTATION CREATION DEBUG END - SUCCESS ===');
    
    return res.status(201).json(populatedConsultation);
  } catch (error) {
    // Only abort if transaction hasn't been committed
    if (session.inTransaction()) {
      await session.abortTransaction();
      console.log('Transaction aborted due to error');
    }
    console.error('=== CONSULTATION CREATION ERROR ===');
    console.error('Error creating consultation:', error);
    console.error('Error stack:', error.stack);
    console.error('=== CONSULTATION CREATION DEBUG END - ERROR ===');
    return res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * Update a consultation
 */
exports.updateConsultation = async (req, res) => {
  console.log('=== CONSULTATION UPDATE START ===');
  console.log('Consultation ID:', req.params.id);
  console.log('Provider ID:', req.user.id);
  console.log('Request body keys:', Object.keys(req.body));
  
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const { id } = req.params;
    const providerId = req.user.id;
    const { vitals, medication, labResults, radiology, ...consultationData } = req.body;
    // Immunization, hospital, surgery are standalone records — strip from update body.
    delete consultationData.immunization;
    delete consultationData.hospital;
    delete consultationData.surgery;
    // parentConsultation is immutable after creation
    delete consultationData.parentConsultation;
    
    console.log('Consultation data keys:', Object.keys(consultationData));
    console.log('Has vitals:', !!vitals);
    console.log('Has medications:', !!medication, Array.isArray(medication) ? medication.length : 'not array');
    
    // Find consultation and check if provider is authorized
    let consultation = await Consultation.findOne({
      _id: id,
      provider: providerId
    }).session(session);
    
    if (!consultation) {
      console.log('Consultation not found or unauthorized');
      await session.abortTransaction();
      return res.status(404).json({ message: 'Consultation not found or unauthorized' });
    }
    
    console.log('Found consultation, status:', consultation.status);
    
    // Update basic consultation fields
    Object.keys(consultationData).forEach(key => {
      // Don't overwrite attachments with an empty array
      if (key === 'attachments' && Array.isArray(consultationData[key]) && consultationData[key].length === 0 && consultation.attachments && consultation.attachments.length > 0) {
        console.log('Skipping attachments update to preserve existing attachments');
        return;
      }
      consultation[key] = consultationData[key];
    });
    
    consultation.lastUpdated = Date.now();
    
    // Update or create medical records
    const patientId = consultation.patient;
    
    // Handle Vitals
    if (vitals && Object.values(vitals).some(val => val && (typeof val === 'object' ? val.value : val))) {
      try {
        console.log('Processing vitals update...');
        if (consultation.vitals) {
          // Update existing vitals record
          await VitalsRecord.findByIdAndUpdate(
            consultation.vitals,
            { ...vitals, updatedAt: Date.now() },
            { session }
          );
          console.log('Updated existing vitals record');
        } else {
          // Create new vitals record
          const vitalsRecord = new VitalsRecord({
            patient: patientId,
            provider: providerId,
            consultation: consultation._id,
            date: consultation.date,
            ...vitals
          });
          await vitalsRecord.save({ session });
          consultation.vitals = vitalsRecord._id;
          console.log('Created new vitals record');
        }
      } catch (vitalsError) {
        console.error('Error updating vitals:', vitalsError);
        throw new Error(`Failed to update vitals: ${vitalsError.message}`);
      }
    }
    
    // Handle Medications - replace all existing
    if (medication && Array.isArray(medication)) {
      // Delete existing medication records for this consultation
      if (consultation.medications && consultation.medications.length > 0) {
        await MedicationRecord.deleteMany({
          _id: { $in: consultation.medications }
        }).session(session);
      }
      
      // Create new medication records
      if (medication.length > 0) {
        const medicationRecords = await Promise.all(
          medication.map(async (med) => {
            const medicationRecord = new MedicationRecord({
              patient: patientId,
              provider: providerId,
              consultation: consultation._id,
              date: consultation.date,
              ...med
            });
            await medicationRecord.save({ session });
            return medicationRecord._id;
          })
        );
        consultation.medications = medicationRecords;
      } else {
        consultation.medications = [];
      }
    }
    
    // Handle Lab Results - replace all existing
    if (labResults && Array.isArray(labResults)) {
      // Delete existing lab result records for this consultation
      if (consultation.labResults && consultation.labResults.length > 0) {
        await LabResultRecord.deleteMany({
          _id: { $in: consultation.labResults }
        }).session(session);
      }
      
      // Create new lab result records
      if (labResults.length > 0) {
        const labResultRecords = await Promise.all(
          labResults.map(async (lab) => {
            const labResultRecord = new LabResultRecord({
              patient: patientId,
              provider: providerId,
              consultation: consultation._id,
              date: consultation.date,
              ...lab
            });
            await labResultRecord.save({ session });
            return labResultRecord._id;
          })
        );
        consultation.labResults = labResultRecords;
      } else {
        consultation.labResults = [];
      }
    }
    
    // Handle Radiology Reports - replace all existing
    if (radiology && Array.isArray(radiology)) {
      // Delete existing radiology records for this consultation
      if (consultation.radiologyReports && consultation.radiologyReports.length > 0) {
        await RadiologyReport.deleteMany({
          _id: { $in: consultation.radiologyReports }
        }).session(session);
      }
      
      // Create new radiology records
      if (radiology.length > 0) {
        const radiologyRecords = await Promise.all(
          radiology.map(async (rad) => {
            const radiologyRecord = new RadiologyReport({
              patient: patientId,
              provider: providerId,
              consultation: consultation._id,
              date: consultation.date,
              ...rad
            });
            await radiologyRecord.save({ session });
            return radiologyRecord._id;
          })
        );
        consultation.radiologyReports = radiologyRecords;
      } else {
        consultation.radiologyReports = [];
      }
    }
    
    try {
      console.log('Saving consultation...');
      await consultation.save({ session });
      console.log('Consultation saved successfully');
      
      // Commit the transaction
      console.log('Committing transaction...');
      await session.commitTransaction();
      console.log('Transaction committed successfully');
    } catch (saveError) {
      console.error('Error saving consultation or committing transaction:', saveError);
      throw saveError;
    }
    
    // Handle post-transaction operations
    try {
      // If status was changed to 'completed', send notification
      if (consultationData.status === 'completed' && consultation.status === 'completed') {
        const patient = await User.findById(consultation.patient);
        
        if (patient) {
          // Import email service
          const emailService = require('../services/email.service');
          
          // Send consultation completed notification
          await emailService.sendTemplateEmail(
            patient.email,
            'consultationCompleted',
            {
              patientName: `${patient.firstName} ${patient.lastName}`,
              providerName: `${req.user.firstName} ${req.user.lastName}`,
              consultationDate: formatDate(consultation.createdAt),
              consultationId: consultation._id
            },
            {
              subject: 'Consultation Completed',
              userId: patient._id,
              queue: true
            }
          );
        }
      }
    } catch (emailError) {
      console.error('Error queuing email notification:', emailError);
      // Don't fail the whole operation if email fails
    }
    
    // Populate the consultation before sending response
    const populatedConsultation = await Consultation.findById(consultation._id)
      .populate('patient', 'firstName lastName email profileImage patientProfile')
      .populate('provider', 'firstName lastName email')
      .populate('vitals')
      .populate('medications')
      .populate('labResults')
      .populate('radiologyReports');
    
    return res.json(populatedConsultation);
  } catch (error) {
    console.error('=== CONSULTATION UPDATE ERROR ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Only abort if transaction hasn't been committed
    if (session.inTransaction()) {
      console.log('Aborting transaction...');
      try {
        await session.abortTransaction();
        console.log('Transaction aborted');
      } catch (abortError) {
        console.error('Error aborting transaction:', abortError);
      }
    }
    
    // Provide more specific error messages
    let errorMessage = 'Server error';
    if (error.message.includes('vitals')) {
      errorMessage = 'Failed to update vitals records';
    } else if (error.message.includes('medication')) {
      errorMessage = 'Failed to update medication records';
    } else if (error.message.includes('validation')) {
      errorMessage = 'Validation error: ' + error.message;
    }
    
    return res.status(500).json({ 
      message: errorMessage, 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    console.log('=== CONSULTATION UPDATE END ===');
    session.endSession();
  }
};

/**
 * Delete a consultation
 */
exports.deleteConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const providerId = req.user.id;
    
    // Find consultation and check if provider is authorized
    const consultation = await Consultation.findOne({
      _id: id,
      provider: providerId
    });
    
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found or unauthorized' });
    }
    
    // Soft delete by archiving
    consultation.status = 'archived';
    consultation.archivedAt = Date.now();
    await consultation.save();
    
    return res.json({ message: 'Consultation archived successfully' });
  } catch (error) {
    console.error('Error deleting consultation:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Add an attachment to a consultation
 */
exports.addAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const providerId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Find consultation and check if provider is authorized
    const consultation = await Consultation.findOne({
      _id: id,
      provider: providerId
    });
    
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found or unauthorized' });
    }
    
    // Add file to attachments
    const newAttachment = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    };
    
    // Ensure attachments array exists
    if (!consultation.attachments) {
      consultation.attachments = [];
    }
    
    consultation.attachments.push(newAttachment);
    consultation.lastUpdated = Date.now();
    await consultation.save();
    
    // Return the attachment with secure URLs
    const addedAttachment = consultation.attachments[consultation.attachments.length - 1];
    
    return res.json({
      success: true,
      attachment: {
        id: addedAttachment._id,
        filename: addedAttachment.filename,
        originalName: addedAttachment.originalName,
        size: addedAttachment.size,
        mimetype: addedAttachment.mimetype,
        uploadDate: addedAttachment.uploadDate,
        viewUrl: `/api/files/consultations/${addedAttachment.filename}?inline=true`,
        downloadUrl: `/api/files/consultations/${addedAttachment.filename}`
      }
    });
  } catch (error) {
    console.error('Error adding attachment:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Delete an attachment from a consultation
 */
exports.deleteAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const providerId = req.user.id;
    
    // Find consultation and check if provider is authorized
    const consultation = await Consultation.findOne({
      _id: id,
      provider: providerId
    });
    
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found or unauthorized' });
    }
    
    // Find the attachment
    const attachment = consultation.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    // Delete file from disk
    try {
      fs.unlinkSync(attachment.path);
    } catch (err) {
      console.error('Error deleting file from disk:', err);
    }
    
    // Remove attachment from consultation
    attachment.remove();
    consultation.lastUpdated = Date.now();
    await consultation.save();
    
    return res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get consultations for a patient
 */
exports.getPatientConsultations = async (req, res) => {
  try {
    const patientId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    // Patients see only completed root consultations (one row per case)
    const consultations = await Consultation.find({
      patient: patientId,
      status: 'completed',
      parentConsultation: null
    })
      .populate('provider', 'firstName lastName providerProfile')
      .sort({ date: -1, createdAt: -1, _id: -1 })
      .limit(limit);

    // Aggregate follow-up counts for visitCount — patients only see completed entries
    const consultationIds = consultations.map(c => c._id);
    const followUpStats = await Consultation.aggregate([
      { $match: { parentConsultation: { $in: consultationIds }, status: 'completed' } },
      { $group: { _id: '$parentConsultation', count: { $sum: 1 }, latestDate: { $max: '$date' } } }
    ]);
    const countMap = {};
    const latestDateMap = {};
    followUpStats.forEach(({ _id, count, latestDate }) => {
      countMap[_id.toString()] = count;
      latestDateMap[_id.toString()] = latestDate;
    });

    return res.json({
      success: true,
      consultations: consultations.map(consultation => {
        const rootDate = consultation.date || consultation.createdAt;
        const latestFollowUp = latestDateMap[consultation._id.toString()];
        const consultationDate = latestFollowUp && (!rootDate || new Date(latestFollowUp) > new Date(rootDate))
          ? latestFollowUp
          : rootDate;
        const formattedDate = consultationDate ? formatDate(consultationDate) : 'N/A';

        return {
          id: consultation._id,
          date: formattedDate,
          rawDate: consultationDate,
          providerName: `${consultation.provider.firstName} ${consultation.provider.lastName}`,
          type: consultation.general?.specialty || 'General',
          specialist: consultation.general?.specialistName ||
                     `${consultation.provider.firstName} ${consultation.provider.lastName}`,
          clinic: consultation.general?.practice ||
                  consultation.provider.providerProfile?.practiceName || 'N/A',
          reason: consultation.general?.reasonForVisit || 'N/A',
          status: consultation.status,
          caseStatus: consultation.caseStatus || 'open',
          visitCount: 1 + (countMap[consultation._id.toString()] || 0)
        };
      })
    });
  } catch (error) {
    console.error('Error fetching patient consultations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load consultations'
    });
  }
};

/**
 * Add a follow-up consultation to an existing root consultation
 */
exports.addFollowUp = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const providerId = req.user.id;

    // Load the root consultation
    const root = await Consultation.findById(id).session(session);
    if (!root) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Consultation not found' });
    }

    // Must be a root consultation
    if (root.parentConsultation) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Cannot add a follow-up to a follow-up consultation' });
    }

    // Only the assigned provider can add follow-ups
    if (root.provider.toString() !== providerId) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'Only the assigned provider can add follow-ups' });
    }

    // Cannot add follow-ups to a closed case
    if (root.caseStatus === 'closed') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Cannot add a follow-up to a closed case. Reopen the case first.' });
    }

    const { vitals, medication, labResults, radiology, ...consultationData } = req.body;
    delete consultationData.patient;
    delete consultationData.patientEmail;
    delete consultationData.provider;
    delete consultationData.parentConsultation;
    delete consultationData.caseStatus;
    delete consultationData.immunization;
    delete consultationData.hospital;
    delete consultationData.surgery;

    const followUp = new Consultation({
      patient: root.patient,
      provider: providerId,
      parentConsultation: root._id,
      caseStatus: 'open',
      ...consultationData,
      status: consultationData.status || 'draft',
      attachments: []
    });
    await followUp.save({ session });

    const patientId = root.patient;

    const hasVitalsData = (v) => {
      if (!v) return false;
      return Object.values(v).some(val => {
        if (!val) return false;
        if (typeof val === 'object') {
          return Object.values(val).some(nested => nested !== null && nested !== undefined && nested !== '');
        }
        return true;
      });
    };

    // Create vitals if provided
    if (hasVitalsData(vitals)) {
      const vitalsRecord = new VitalsRecord({
        patient: patientId,
        provider: providerId,
        consultation: followUp._id,
        date: followUp.date,
        ...vitals
      });
      await vitalsRecord.save({ session });
      followUp.vitals = vitalsRecord._id;
    }

    // Create medications if provided
    if (medication && Array.isArray(medication) && medication.length > 0) {
      const medicationRecords = await Promise.all(
        medication.map(async (med) => {
          const medicationRecord = new MedicationRecord({
            patient: patientId,
            provider: providerId,
            consultation: followUp._id,
            date: followUp.date,
            ...med
          });
          await medicationRecord.save({ session });
          return medicationRecord._id;
        })
      );
      followUp.medications = medicationRecords;
    }

    // Create lab results if provided
    if (labResults && Array.isArray(labResults) && labResults.length > 0) {
      const labResultRecords = await Promise.all(
        labResults.map(async (lab) => {
          const labResultRecord = new LabResultRecord({
            patient: patientId,
            provider: providerId,
            consultation: followUp._id,
            date: followUp.date,
            ...lab
          });
          await labResultRecord.save({ session });
          return labResultRecord._id;
        })
      );
      followUp.labResults = labResultRecords;
    }

    // Create radiology reports if provided
    if (radiology && Array.isArray(radiology) && radiology.length > 0) {
      const radiologyRecords = await Promise.all(
        radiology.map(async (rad) => {
          const radiologyRecord = new RadiologyReport({
            patient: patientId,
            provider: providerId,
            consultation: followUp._id,
            date: followUp.date,
            ...rad
          });
          await radiologyRecord.save({ session });
          return radiologyRecord._id;
        })
      );
      followUp.radiologyReports = radiologyRecords;
    }

    await followUp.save({ session });
    await session.commitTransaction();

    const populatedFollowUp = await Consultation.findById(followUp._id)
      .populate('patient', 'firstName lastName email profileImage patientProfile')
      .populate('provider', 'firstName lastName email')
      .populate('vitals')
      .populate('medications')
      .populate('labResults')
      .populate('radiologyReports');

    return res.status(201).json(populatedFollowUp);
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error('Error adding follow-up:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * Close a consultation case
 */
exports.closeCase = async (req, res) => {
  try {
    const { id } = req.params;
    const providerId = req.user.id;

    const consultation = await Consultation.findById(id)
      .populate('patient', 'firstName lastName email profileImage patientProfile')
      .populate('provider', 'firstName lastName email')
      .populate('vitals')
      .populate('medications')
      .populate('labResults')
      .populate('radiologyReports');

    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    if (consultation.provider._id.toString() !== providerId) {
      return res.status(403).json({ message: 'Only the assigned provider can close this case' });
    }

    try {
      consultation.closeCase();
    } catch (domainError) {
      return res.status(400).json({ message: domainError.message });
    }
    await consultation.save();

    const followUps = await Consultation.find({ parentConsultation: consultation._id })
      .populate('provider', 'firstName lastName email')
      .populate('vitals')
      .populate('medications')
      .populate('labResults')
      .populate('radiologyReports')
      .sort({ date: 1, createdAt: 1 });

    const result = consultation.toObject({ virtuals: true });
    result.thread = followUps.map(f => f.toObject({ virtuals: true }));
    result.visitCount = 1 + followUps.length;

    return res.json(result);
  } catch (error) {
    console.error('Error closing case:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * Reopen a closed consultation case
 */
exports.reopenCase = async (req, res) => {
  try {
    const { id } = req.params;
    const providerId = req.user.id;

    const consultation = await Consultation.findById(id)
      .populate('patient', 'firstName lastName email profileImage patientProfile')
      .populate('provider', 'firstName lastName email')
      .populate('vitals')
      .populate('medications')
      .populate('labResults')
      .populate('radiologyReports');

    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    if (consultation.provider._id.toString() !== providerId) {
      return res.status(403).json({ message: 'Only the assigned provider can reopen this case' });
    }

    try {
      consultation.reopenCase();
    } catch (domainError) {
      return res.status(400).json({ message: domainError.message });
    }
    await consultation.save();

    const followUps = await Consultation.find({ parentConsultation: consultation._id })
      .populate('provider', 'firstName lastName email')
      .populate('vitals')
      .populate('medications')
      .populate('labResults')
      .populate('radiologyReports')
      .sort({ date: 1, createdAt: 1 });

    const result = consultation.toObject({ virtuals: true });
    result.thread = followUps.map(f => f.toObject({ virtuals: true }));
    result.visitCount = 1 + followUps.length;

    return res.json(result);
  } catch (error) {
    console.error('Error reopening case:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * Get consultation statistics for a patient
 */
exports.getPatientConsultationStatistics = async (req, res) => {
  try {
    const patientId = req.user.id;
    
    // Get total consultations
    const total = await Consultation.countDocuments({ patient: patientId });
    
    // Get consultations this month
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    
    const thisMonth = await Consultation.countDocuments({
      patient: patientId,
      createdAt: { $gte: thisMonthStart }
    });
    
    // Get consultations this year
    const thisYearStart = new Date();
    thisYearStart.setMonth(0, 1);
    thisYearStart.setHours(0, 0, 0, 0);
    
    const thisYear = await Consultation.countDocuments({
      patient: patientId,
      createdAt: { $gte: thisYearStart }
    });
    
    return res.json({
      success: true,
      statistics: {
        total,
        thisMonth,
        thisYear
      }
    });
  } catch (error) {
    console.error('Error fetching consultation statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load consultation statistics'
    });
  }
}; 