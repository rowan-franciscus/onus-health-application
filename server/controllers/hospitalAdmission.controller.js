const mongoose = require('mongoose');
const HospitalAdmission = require('../models/HospitalAdmission');
const Connection = require('../models/Connection');

const PATIENT_POPULATE = 'firstName lastName email profileImage patientProfile';
const PROVIDER_POPULATE = 'firstName lastName email providerProfile';

// Any connection suffices for read access; full approved access required for mutations.
async function providerCanAccessPatient(providerId, patientId) {
  const connection = await Connection.findOne({ provider: providerId, patient: patientId });
  return Boolean(connection);
}

async function providerCanMutateAdmission(providerId, patientId) {
  const connection = await Connection.findOne({
    provider: providerId,
    patient: patientId,
    accessLevel: 'full',
    fullAccessStatus: 'approved',
  });
  return Boolean(connection);
}

// Converts empty strings to undefined so Mongoose never tries to cast "" → Number.
const toNum = (x) => {
  if (x === '' || x === null || x === undefined) return undefined;
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
};

function sanitizeObservationInput(input = {}, recordedBy) {
  const v = input.vitals || {};
  const heartRate = toNum(v.heartRate);
  const bpSystolic = toNum(v.bpSystolic);
  const bpDiastolic = toNum(v.bpDiastolic);
  const temperature = toNum(v.temperature);
  const respiratoryRate = toNum(v.respiratoryRate);
  const bloodGlucose = toNum(v.bloodGlucose);
  const spo2 = toNum(v.spo2);

  // Only persist context enums when the corresponding numeric value is present.
  const bloodGlucoseType = bloodGlucose !== undefined ? (v.bloodGlucoseType || '') : '';
  const spo2Context = spo2 !== undefined ? (v.spo2Context || '') : '';

  return {
    recordedBy,
    recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
    vitals: { heartRate, bpSystolic, bpDiastolic, temperature, respiratoryRate, bloodGlucose, bloodGlucoseType, spo2, spo2Context },
    medicationsAdministered: input.medicationsAdministered || '',
    notes: input.notes || '',
    assessment: input.assessment || '',
    plan: input.plan || '',
  };
}

// Returns true when the observation carries at least one meaningful piece of clinical data.
function hasObservationContent(input = {}) {
  const v = input.vitals || {};
  return (
    toNum(v.heartRate) !== undefined ||
    toNum(v.bpSystolic) !== undefined ||
    toNum(v.bpDiastolic) !== undefined ||
    toNum(v.temperature) !== undefined ||
    toNum(v.respiratoryRate) !== undefined ||
    toNum(v.bloodGlucose) !== undefined ||
    toNum(v.spo2) !== undefined ||
    !!(input.medicationsAdministered || '').trim() ||
    !!(input.notes || '').trim() ||
    !!(input.assessment || '').trim() ||
    !!(input.plan || '').trim()
  );
}

exports.createAdmission = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { patient, hospitalName, admissionDate, reasonForHospitalization, observation } = req.body;

    if (!patient || !hospitalName || !admissionDate || !reasonForHospitalization) {
      return res.status(400).json({ success: false, message: 'Missing required admission fields' });
    }
    if (!mongoose.isValidObjectId(patient)) {
      return res.status(400).json({ success: false, message: 'Invalid patient ID' });
    }

    const hasAccess = await providerCanAccessPatient(providerId, patient);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'No connection to this patient' });
    }

    // Only seed an initial observation when the provider actually filled something in.
    const observations = hasObservationContent(observation || {})
      ? [sanitizeObservationInput(observation, providerId)]
      : [];

    const admission = await HospitalAdmission.create({
      patient,
      provider: providerId,
      hospitalName,
      admissionDate: new Date(admissionDate),
      reasonForHospitalization,
      status: 'admitted',
      observations,
    });

    const populated = await HospitalAdmission.findById(admission._id)
      .populate('patient', PATIENT_POPULATE)
      .populate('provider', PROVIDER_POPULATE)
      .populate('observations.recordedBy', PROVIDER_POPULATE);

    return res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating hospital admission:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.listAdmissionsForProvider = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { search = '', patientId } = req.query;

    const fullAccessConnections = await Connection.find({
      provider: providerId,
      accessLevel: 'full',
      fullAccessStatus: 'approved',
    }).select('patient');
    const fullAccessPatientIds = fullAccessConnections.map(c => c.patient);

    const accessFilter = {
      $or: [{ provider: new mongoose.Types.ObjectId(providerId) }, { patient: { $in: fullAccessPatientIds } }],
    };
    const baseMatch = patientId && mongoose.isValidObjectId(patientId)
      ? { ...accessFilter, patient: new mongoose.Types.ObjectId(patientId) }
      : accessFilter;

    const pipeline = [
      { $match: baseMatch },
      {
        $lookup: {
          from: 'users',
          localField: 'patient',
          foreignField: '_id',
          as: '_patientDoc',
        },
      },
      { $unwind: { path: '$_patientDoc', preserveNullAndEmptyArrays: true } },
    ];

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      pipeline.push({
        $match: {
          $or: [
            { '_patientDoc.firstName': regex },
            { '_patientDoc.lastName': regex },
            { hospitalName: regex },
            { reasonForHospitalization: regex },
            { status: regex },
          ],
        },
      });
    }

    pipeline.push({ $sort: { admissionDate: -1, createdAt: -1 } });

    const raw = await HospitalAdmission.aggregate(pipeline);

    // Populate provider and recordedBy via mongoose after aggregation.
    const ids = raw.map(a => a._id);
    const admissions = await HospitalAdmission.find({ _id: { $in: ids } })
      .populate('patient', PATIENT_POPULATE)
      .populate('provider', PROVIDER_POPULATE)
      .sort({ admissionDate: -1, createdAt: -1 });

    const result = admissions.map(a => {
      const obj = a.toObject({ virtuals: true });
      obj.observationCount = a.observations.length;
      return obj;
    });

    return res.json(result);
  } catch (error) {
    console.error('Error listing admissions:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.listAdmissionsForPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { id: userId, role } = req.user;

    if (!mongoose.isValidObjectId(patientId)) {
      return res.status(400).json({ success: false, message: 'Invalid patient ID' });
    }

    if (role === 'patient' && String(patientId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (role === 'provider') {
      const hasAccess = await providerCanAccessPatient(userId, patientId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'No connection to this patient' });
      }
    }

    const admissions = await HospitalAdmission.find({ patient: patientId })
      .populate('patient', PATIENT_POPULATE)
      .populate('provider', PROVIDER_POPULATE)
      .sort({ admissionDate: -1, createdAt: -1 });

    const result = admissions.map(a => {
      const obj = a.toObject({ virtuals: true });
      obj.observationCount = a.observations.length;
      return obj;
    });

    return res.json(result);
  } catch (error) {
    console.error('Error listing patient admissions:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getAdmissionById = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const { id: userId, role } = req.user;

    if (!mongoose.isValidObjectId(admissionId)) {
      return res.status(400).json({ success: false, message: 'Invalid admission ID' });
    }

    const admission = await HospitalAdmission.findById(admissionId)
      .populate('patient', PATIENT_POPULATE)
      .populate('provider', PROVIDER_POPULATE)
      .populate('observations.recordedBy', PROVIDER_POPULATE);

    if (admission) {
      // Enrich the audit read event with the record's subject
      req.audit?.set({ patientId: admission.patient?._id, resourceId: admission._id });
    }

    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }

    const patientId = admission.patient._id.toString();
    if (role === 'patient' && String(patientId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (role === 'provider') {
      const isCreator = admission.provider._id.toString() === String(userId);
      if (!isCreator) {
        const hasAccess = await providerCanAccessPatient(userId, patientId);
        if (!hasAccess) {
          return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
      }
    }

    return res.json(admission);
  } catch (error) {
    console.error('Error fetching admission:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.addObservation = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const providerId = req.user.id;

    if (!hasObservationContent(req.body || {})) {
      return res.status(400).json({ success: false, message: 'Observation must include at least one vital, medication, note, assessment, or plan' });
    }

    const admission = await HospitalAdmission.findById(admissionId);
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }
    if (admission.status === 'discharged') {
      return res.status(400).json({ success: false, message: 'Cannot add observation to a discharged admission' });
    }

    const isCreator = admission.provider.toString() === String(providerId);
    if (!isCreator) {
      const hasAccess = await providerCanMutateAdmission(providerId, admission.patient);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    admission.observations.push(sanitizeObservationInput(req.body, providerId));
    await admission.save();

    const populated = await HospitalAdmission.findById(admission._id)
      .populate('patient', PATIENT_POPULATE)
      .populate('provider', PROVIDER_POPULATE)
      .populate('observations.recordedBy', PROVIDER_POPULATE);

    return res.status(201).json(populated);
  } catch (error) {
    console.error('Error adding observation:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.reAdmitPatient = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const providerId = req.user.id;

    const admission = await HospitalAdmission.findById(admissionId);
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }
    if (admission.status === 'admitted') {
      return res.status(400).json({ success: false, message: 'Patient is already admitted' });
    }

    const isCreator = admission.provider.toString() === String(providerId);
    if (!isCreator) {
      const hasAccess = await providerCanMutateAdmission(providerId, admission.patient);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    admission.status = 'admitted';
    admission.dischargedAt = null;
    admission.dischargeSummary = null;
    await admission.save();

    const populated = await HospitalAdmission.findById(admission._id)
      .populate('patient', PATIENT_POPULATE)
      .populate('provider', PROVIDER_POPULATE)
      .populate('observations.recordedBy', PROVIDER_POPULATE);

    return res.json(populated);
  } catch (error) {
    console.error('Error re-admitting patient:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.dischargePatient = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const providerId = req.user.id;
    const { dischargeSummary } = req.body || {};

    if (!mongoose.isValidObjectId(admissionId)) {
      return res.status(400).json({ success: false, message: 'Invalid admission ID' });
    }

    const admission = await HospitalAdmission.findById(admissionId);
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }
    if (admission.status === 'discharged') {
      return res.status(400).json({ success: false, message: 'Already discharged' });
    }

    const isCreator = admission.provider.toString() === String(providerId);
    if (!isCreator) {
      const hasAccess = await providerCanMutateAdmission(providerId, admission.patient);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    admission.status = 'discharged';
    admission.dischargedAt = new Date();
    admission.dischargeSummary =
      typeof dischargeSummary === 'string' && dischargeSummary.trim()
        ? dischargeSummary.trim()
        : null;
    await admission.save();

    const populated = await HospitalAdmission.findById(admission._id)
      .populate('patient', PATIENT_POPULATE)
      .populate('provider', PROVIDER_POPULATE)
      .populate('observations.recordedBy', PROVIDER_POPULATE);

    return res.json(populated);
  } catch (error) {
    console.error('Error discharging patient:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
