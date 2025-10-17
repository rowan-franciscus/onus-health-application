const mongoose = require('mongoose');
const Consultation = require('../models/Consultation');
const User = require('../models/User');
const Connection = require('../models/Connection');
const { formatDate } = require('../utils/dateUtils');

// Import medical record models
const VitalsRecord = require('../models/VitalsRecord');
const MedicationRecord = require('../models/MedicationRecord');
const ImmunizationRecord = require('../models/ImmunizationRecord');
const LabResultRecord = require('../models/LabResultRecord');
const RadiologyReport = require('../models/RadiologyReport');
const HospitalRecord = require('../models/HospitalRecord');
const SurgeryRecord = require('../models/SurgeryRecord');

/**
 * Update a consultation without transactions (temporary fix)
 */
exports.updateConsultationSimple = async (req, res) => {
  console.log('=== SIMPLE CONSULTATION UPDATE START ===');
  console.log('Consultation ID:', req.params.id);
  console.log('Provider ID:', req.user.id);
  console.log('Request body keys:', Object.keys(req.body));
  
  try {
    const { id } = req.params;
    const providerId = req.user.id;
    const { vitals, medication, immunization, labResults, radiology, hospital, surgery, ...consultationData } = req.body;
    
    console.log('Consultation data keys:', Object.keys(consultationData));
    
    // Find consultation and check if provider is authorized
    let consultation = await Consultation.findOne({
      _id: id,
      provider: providerId
    });
    
    if (!consultation) {
      console.log('Consultation not found or unauthorized');
      return res.status(404).json({ message: 'Consultation not found or unauthorized' });
    }
    
    console.log('Found consultation, status:', consultation.status);
    console.log('Updating to status:', consultationData.status);
    console.log('General data:', consultationData.general);
    
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
    
    // Check if required fields are present when changing to completed status
    if (consultationData.status === 'completed') {
      if (!consultation.general?.reasonForVisit || consultation.general.reasonForVisit.trim() === '') {
        console.log('Missing required field: reasonForVisit for completed consultation');
        return res.status(400).json({ 
          message: 'Reason for visit is required for completed consultations',
          field: 'general.reasonForVisit'
        });
      }
    }
    
    // Save the consultation first
    try {
      await consultation.save();
      console.log('Consultation basic fields updated');
    } catch (saveError) {
      console.error('Error saving consultation:', saveError);
      if (saveError.name === 'ValidationError') {
        const errors = Object.keys(saveError.errors).map(key => ({
          field: key,
          message: saveError.errors[key].message
        }));
        return res.status(400).json({
          message: 'Validation error',
          errors: errors
        });
      }
      throw saveError;
    }
    
    // Update medical records without transactions
    const patientId = consultation.patient;
    
    // Handle Vitals
    if (vitals && Object.values(vitals).some(val => val && (typeof val === 'object' ? val.value : val))) {
      try {
        console.log('Processing vitals update...');
        if (consultation.vitals) {
          // Update existing vitals record
          await VitalsRecord.findByIdAndUpdate(
            consultation.vitals,
            { ...vitals, updatedAt: Date.now() }
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
          await vitalsRecord.save();
          consultation.vitals = vitalsRecord._id;
          await consultation.save();
          console.log('Created new vitals record');
        }
      } catch (vitalsError) {
        console.error('Error updating vitals:', vitalsError);
        // Continue with other updates
      }
    }
    
    // Handle Medications - replace all existing
    if (medication && Array.isArray(medication)) {
      try {
        console.log('Processing medications update...');
        // Delete existing medication records for this consultation
        if (consultation.medications && consultation.medications.length > 0) {
          await MedicationRecord.deleteMany({
            _id: { $in: consultation.medications }
          });
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
              await medicationRecord.save();
              return medicationRecord._id;
            })
          );
          consultation.medications = medicationRecords;
        } else {
          consultation.medications = [];
        }
        await consultation.save();
        console.log(`Updated ${medication.length} medication records`);
      } catch (medError) {
        console.error('Error updating medications:', medError);
      }
    }
    
    // Handle Immunizations - replace all existing
    if (immunization && Array.isArray(immunization)) {
      try {
        console.log('Processing immunizations update...');
        if (consultation.immunizations && consultation.immunizations.length > 0) {
          await ImmunizationRecord.deleteMany({
            _id: { $in: consultation.immunizations }
          });
        }
        
        if (immunization.length > 0) {
          const immunizationRecords = await Promise.all(
            immunization.map(async (imm) => {
              const immunizationRecord = new ImmunizationRecord({
                patient: patientId,
                provider: providerId,
                consultation: consultation._id,
                date: consultation.date,
                ...imm
              });
              await immunizationRecord.save();
              return immunizationRecord._id;
            })
          );
          consultation.immunizations = immunizationRecords;
        } else {
          consultation.immunizations = [];
        }
        await consultation.save();
        console.log(`Updated ${immunization.length} immunization records`);
      } catch (immError) {
        console.error('Error updating immunizations:', immError);
      }
    }
    
    // Handle Lab Results
    if (labResults && Array.isArray(labResults)) {
      try {
        console.log('Processing lab results update...');
        if (consultation.labResults && consultation.labResults.length > 0) {
          await LabResultRecord.deleteMany({
            _id: { $in: consultation.labResults }
          });
        }
        
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
              await labResultRecord.save();
              return labResultRecord._id;
            })
          );
          consultation.labResults = labResultRecords;
        } else {
          consultation.labResults = [];
        }
        await consultation.save();
        console.log(`Updated ${labResults.length} lab result records`);
      } catch (labError) {
        console.error('Error updating lab results:', labError);
      }
    }
    
    // Handle Radiology Reports
    if (radiology && Array.isArray(radiology)) {
      try {
        console.log('Processing radiology reports update...');
        if (consultation.radiologyReports && consultation.radiologyReports.length > 0) {
          await RadiologyReport.deleteMany({
            _id: { $in: consultation.radiologyReports }
          });
        }
        
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
              await radiologyRecord.save();
              return radiologyRecord._id;
            })
          );
          consultation.radiologyReports = radiologyRecords;
        } else {
          consultation.radiologyReports = [];
        }
        await consultation.save();
        console.log(`Updated ${radiology.length} radiology records`);
      } catch (radError) {
        console.error('Error updating radiology reports:', radError);
      }
    }
    
    // Handle Hospital Records
    if (hospital && Array.isArray(hospital)) {
      try {
        console.log('Processing hospital records update...');
        if (consultation.hospitalRecords && consultation.hospitalRecords.length > 0) {
          await HospitalRecord.deleteMany({
            _id: { $in: consultation.hospitalRecords }
          });
        }
        
        if (hospital.length > 0) {
          const hospitalRecords = await Promise.all(
            hospital.map(async (hosp) => {
              const hospitalRecord = new HospitalRecord({
                patient: patientId,
                provider: providerId,
                consultation: consultation._id,
                date: consultation.date,
                ...hosp
              });
              await hospitalRecord.save();
              return hospitalRecord._id;
            })
          );
          consultation.hospitalRecords = hospitalRecords;
        } else {
          consultation.hospitalRecords = [];
        }
        await consultation.save();
        console.log(`Updated ${hospital.length} hospital records`);
      } catch (hospError) {
        console.error('Error updating hospital records:', hospError);
      }
    }
    
    // Handle Surgery Records
    if (surgery && Array.isArray(surgery)) {
      try {
        console.log('Processing surgery records update...');
        if (consultation.surgeryRecords && consultation.surgeryRecords.length > 0) {
          await SurgeryRecord.deleteMany({
            _id: { $in: consultation.surgeryRecords }
          });
        }
        
        if (surgery.length > 0) {
          const surgeryRecords = await Promise.all(
            surgery.map(async (surg) => {
              const surgeryRecord = new SurgeryRecord({
                patient: patientId,
                provider: providerId,
                consultation: consultation._id,
                date: consultation.date,
                ...surg
              });
              await surgeryRecord.save();
              return surgeryRecord._id;
            })
          );
          consultation.surgeryRecords = surgeryRecords;
        } else {
          consultation.surgeryRecords = [];
        }
        await consultation.save();
        console.log(`Updated ${surgery.length} surgery records`);
      } catch (surgError) {
        console.error('Error updating surgery records:', surgError);
      }
    }
    
    // Handle post-update operations
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
      .populate('immunizations')
      .populate('labResults')
      .populate('radiologyReports')
      .populate('hospitalRecords')
      .populate('surgeryRecords');
    
    console.log('=== SIMPLE CONSULTATION UPDATE SUCCESS ===');
    return res.json(populatedConsultation);
  } catch (error) {
    console.error('=== SIMPLE CONSULTATION UPDATE ERROR ===');
    console.error('Error:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};
