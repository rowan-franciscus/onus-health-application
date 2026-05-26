/**
 * Practice Admin Controller
 *
 * All endpoints here are scoped to the Practice Admin's Practice. Clinical
 * data is never returned — every consultation passes through
 * sanitizeConsultationForPracticeAdmin before leaving the server.
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Practice = require('../models/Practice');
const Connection = require('../models/Connection');
const Consultation = require('../models/Consultation');
const logger = require('../utils/logger');
const config = require('../config/environment');
const {
  sanitizeConsultationForPracticeAdmin,
  sanitizePatientForPracticeAdmin
} = require('../utils/sanitizeForPracticeAdmin');

// Internal: load practice + provider list for the current request.
async function loadPracticeContext(req) {
  const practice = await Practice.findById(req.practiceId);
  if (!practice) return { practice: null, providerIds: [] };
  const providerIds = [practice.owner, ...(practice.members || [])]
    .filter(Boolean)
    .map(id => id.toString());
  return { practice, providerIds: [...new Set(providerIds)] };
}

/**
 * GET /practice-admin/practice
 * Return the practice and its providers (for the dropdown when registering a patient).
 */
exports.getPractice = async (req, res) => {
  try {
    const { practice, providerIds } = await loadPracticeContext(req);
    if (!practice) {
      return res.status(404).json({ success: false, message: 'Practice not found' });
    }
    const providers = await User.find({
      _id: { $in: providerIds },
      role: 'provider'
    }).select('firstName lastName email providerProfile.specialty');

    res.json({
      success: true,
      practice: {
        _id: practice._id,
        name: practice.name,
        owner: practice.owner,
        providers
      }
    });
  } catch (error) {
    logger.error('practiceAdmin.getPractice error:', error);
    res.status(500).json({ success: false, message: 'Failed to load practice' });
  }
};

/**
 * GET /practice-admin/patients
 * Return every patient connected to any provider in this practice.
 */
exports.getPatients = async (req, res) => {
  try {
    const { providerIds } = await loadPracticeContext(req);
    if (providerIds.length === 0) {
      return res.json({ success: true, patients: [] });
    }

    const connections = await Connection.find({ provider: { $in: providerIds } })
      .populate('patient', 'firstName lastName email phone profileImage patientProfile');

    // De-duplicate patients (a patient may be connected to several providers in the practice)
    const seen = new Map();
    for (const c of connections) {
      if (!c.patient) continue;
      const id = c.patient._id.toString();
      if (!seen.has(id)) {
        seen.set(id, sanitizePatientForPracticeAdmin(c.patient));
      }
    }

    res.json({ success: true, patients: Array.from(seen.values()) });
  } catch (error) {
    logger.error('practiceAdmin.getPatients error:', error);
    res.status(500).json({ success: false, message: 'Failed to load patients' });
  }
};

/**
 * POST /practice-admin/patients
 * Register a new patient against a chosen provider in the practice.
 */
exports.registerPatient = async (req, res) => {
  try {
    const { providerId, firstName, lastName, gender, dateOfBirth, phone, email, medicalAidProvider, plan } = req.body;
    const { providerIds } = await loadPracticeContext(req);

    if (!providerId || !providerIds.includes(providerId.toString())) {
      return res.status(400).json({ success: false, message: 'Treating provider must be a member of your practice' });
    }
    if (!firstName || !lastName || !gender || !dateOfBirth) {
      return res.status(400).json({ success: false, message: 'firstName, lastName, gender and dateOfBirth are required' });
    }

    const parsedDob = new Date(dateOfBirth);
    if (isNaN(parsedDob.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date of birth' });
    }

    const validGenders = ['male', 'female', 'other', 'prefer not to say'];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({ success: false, message: 'Invalid gender value' });
    }

    const trimmedEmail = email ? email.trim().toLowerCase() : null;
    let patient = null;
    if (trimmedEmail) {
      const existing = await User.findOne({ email: trimmedEmail });
      if (existing) {
        if (existing.isOnusUser) {
          return res.status(409).json({
            success: false,
            message: 'A user with this email already exists on Onus.'
          });
        }
        const existingConn = await Connection.findOne({ patient: existing._id, provider: providerId });
        if (existingConn) {
          return res.status(409).json({ success: false, message: 'This provider already has a connection with this patient.' });
        }
        patient = existing;
      }
    }

    if (!patient) {
      patient = new User({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: trimmedEmail || undefined,
        phone: phone ? phone.trim() : undefined,
        role: 'patient',
        isOnusUser: false,
        isEmailVerified: false,
        isProfileCompleted: false,
        registeredBy: providerId,
        patientProfile: {
          dateOfBirth: parsedDob,
          gender,
          insurance: {
            provider: medicalAidProvider ? medicalAidProvider.trim() : undefined,
            plan: plan ? plan.trim() : undefined
          }
        }
      });
      await patient.save();
    }

    const connection = new Connection({
      patient: patient._id,
      provider: providerId,
      initiatedBy: req.user._id,
      accessLevel: 'limited',
      fullAccessStatus: 'none',
      patientNotified: false
    });
    await connection.save();

    res.status(201).json({
      success: true,
      patient: sanitizePatientForPracticeAdmin(patient)
    });
  } catch (error) {
    logger.error('practiceAdmin.registerPatient error:', error);
    res.status(500).json({ success: false, message: 'Failed to register patient' });
  }
};

/**
 * GET /practice-admin/patients/:patientId
 * Demographics + insurance only. Verifies the patient belongs to the practice.
 */
exports.getPatientById = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { providerIds } = await loadPracticeContext(req);

    const connection = await Connection.exists({
      patient: patientId,
      provider: { $in: providerIds }
    });
    if (!connection) {
      return res.status(403).json({ success: false, message: 'Patient not in your practice' });
    }

    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.json({ success: true, patient: sanitizePatientForPracticeAdmin(patient) });
  } catch (error) {
    logger.error('practiceAdmin.getPatientById error:', error);
    res.status(500).json({ success: false, message: 'Failed to load patient' });
  }
};

/**
 * GET /practice-admin/patients/:patientId/operational-overview
 * Consultation list with ONLY date, provider name, diagnosis, billing status.
 */
exports.getOperationalOverview = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { providerIds } = await loadPracticeContext(req);

    const connection = await Connection.exists({
      patient: patientId,
      provider: { $in: providerIds }
    });
    if (!connection) {
      return res.status(403).json({ success: false, message: 'Patient not in your practice' });
    }

    const consultations = await Consultation.find({
      patient: patientId,
      provider: { $in: providerIds }
    })
      .sort({ date: -1 })
      .populate('provider', 'firstName lastName')
      .select('date general.diagnosis billingStatus status provider');

    res.json({
      success: true,
      consultations: consultations.map(sanitizeConsultationForPracticeAdmin)
    });
  } catch (error) {
    logger.error('practiceAdmin.getOperationalOverview error:', error);
    res.status(500).json({ success: false, message: 'Failed to load overview' });
  }
};

/**
 * GET /practice-admin/billing
 * Cross-patient billing list across the practice.
 */
exports.getBilling = async (req, res) => {
  try {
    const { providerIds } = await loadPracticeContext(req);
    const consultations = await Consultation.find({ provider: { $in: providerIds } })
      .sort({ date: -1 })
      .populate('patient', 'firstName lastName')
      .populate('provider', 'firstName lastName')
      .select('date general.diagnosis billingStatus status patient provider');

    res.json({
      success: true,
      consultations: consultations.map(sanitizeConsultationForPracticeAdmin)
    });
  } catch (error) {
    logger.error('practiceAdmin.getBilling error:', error);
    res.status(500).json({ success: false, message: 'Failed to load billing' });
  }
};

/**
 * PATCH /practice-admin/billing/:consultationId/status
 */
exports.updateBillingStatus = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { billingStatus } = req.body;
    if (!['pending', 'processed', 'submitted'].includes(billingStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid billingStatus' });
    }

    const { providerIds } = await loadPracticeContext(req);
    const consultation = await Consultation.findOne({
      _id: consultationId,
      provider: { $in: providerIds }
    });
    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Consultation not found in your practice' });
    }

    // Whitelisted update — only billingStatus is touched.
    consultation.billingStatus = billingStatus;
    await consultation.save();

    res.json({ success: true, consultation: sanitizeConsultationForPracticeAdmin(consultation) });
  } catch (error) {
    logger.error('practiceAdmin.updateBillingStatus error:', error);
    res.status(500).json({ success: false, message: 'Failed to update billing status' });
  }
};

/**
 * GET /practice-admin/billing/export/csv
 */
exports.exportBillingCsv = async (req, res) => {
  try {
    const { providerIds } = await loadPracticeContext(req);
    const consultations = await Consultation.find({ provider: { $in: providerIds } })
      .sort({ date: -1 })
      .populate('patient', 'firstName lastName')
      .populate('provider', 'firstName lastName')
      .select('date general.diagnosis billingStatus patient provider');

    const escape = v => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };

    const header = 'Date,Patient,Provider,Diagnosis,Status';
    const rows = consultations.map(c => {
      const date = c.date ? new Date(c.date).toLocaleDateString('en-GB') : '';
      const patient = c.patient ? `${c.patient.firstName || ''} ${c.patient.lastName || ''}`.trim() : '';
      const provider = c.provider ? `Dr. ${c.provider.firstName || ''} ${c.provider.lastName || ''}`.trim() : '';
      const diagnosis = c.general && c.general.diagnosis ? c.general.diagnosis : '';
      const status = c.billingStatus || 'pending';
      return [date, patient, provider, diagnosis, status].map(escape).join(',');
    });

    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="onus-billing-export.csv"');
    res.send(csv);
  } catch (error) {
    logger.error('practiceAdmin.exportBillingCsv error:', error);
    res.status(500).json({ success: false, message: 'Failed to export CSV' });
  }
};

/**
 * GET /practice-admin/billing/export/pdf
 * Returns the same data as JSON; the client renders the PDF with jsPDF.
 * (Server-side PDF would need an extra dependency; keeping it client-side mirrors
 * the existing `consultationExport.js` pattern.)
 */
exports.exportBillingData = async (req, res) => {
  // Reuses the JSON view of getBilling; client will format the PDF.
  return exports.getBilling(req, res);
};
