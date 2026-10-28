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
const { onboardProviderInitiatedPatient } = require('../services/patientOnboarding.service');
const consentService = require('../services/consent.service');
const { consentedConsultationFilter } = require('../middleware/auth.middleware');
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

    await consentService.expireStale({ provider: { $in: providerIds } });

    const connections = await Connection.find({ provider: { $in: providerIds } })
      .populate('patient', 'firstName lastName email phone profileImage patientProfile');

    // De-duplicate patients (a patient may be connected to several providers in the practice)
    const seen = new Map();
    for (const c of connections) {
      if (!c.patient) continue;
      const id = c.patient._id.toString();
      if (!seen.has(id)) {
        seen.set(id, { ...sanitizePatientForPracticeAdmin(c.patient), consentStatus: c.consent?.status });
      } else if (c.consent?.status === 'ACTIVE') {
        // Show ACTIVE if any provider in the practice has consent
        seen.get(id).consentStatus = 'ACTIVE';
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
    const { providerId } = req.body;
    const { providerIds } = await loadPracticeContext(req);

    if (!providerId || !providerIds.includes(providerId.toString())) {
      return res.status(400).json({ success: false, message: 'Treating provider must be a member of your practice' });
    }

    const provider = await User.findById(providerId);
    const result = await onboardProviderInitiatedPatient({ provider, req, data: req.body, consentForm: req.file });
    const { patient } = result;
    res.status(result.status).json({
      ...result.body,
      ...(patient && result.status < 300 ? { patient: sanitizePatientForPracticeAdmin(patient) } : {})
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

    // Only consultations whose patient's consent to that provider is ACTIVE
    const consultations = await Consultation.find(await consentedConsultationFilter(providerIds, patientId))
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
    const consultations = await Consultation.find(await consentedConsultationFilter(providerIds))
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
      ...(await consentedConsultationFilter(providerIds))
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
    const consultations = await Consultation.find(await consentedConsultationFilter(providerIds))
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
