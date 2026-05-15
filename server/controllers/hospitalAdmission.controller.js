const mongoose = require('mongoose');
const HospitalAdmission = require('../models/HospitalAdmission');
const Connection = require('../models/Connection');
const User = require('../models/User');

const PATIENT_POPULATE = 'firstName lastName email profileImage patientProfile';
const PROVIDER_POPULATE = 'firstName lastName email providerProfile';

async function providerCanAccessPatient(providerId, patientId) {
  const connection = await Connection.findOne({ provider: providerId, patient: patientId });
  return Boolean(connection);
}

function sanitizeObservationInput(input = {}, recordedBy) {
  const v = input.vitals || {};
  return {
    recordedBy,
    recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
    vitals: {
      heartRate: v.heartRate ?? undefined,
      bpSystolic: v.bpSystolic ?? undefined,
      bpDiastolic: v.bpDiastolic ?? undefined,
      temperature: v.temperature ?? undefined,
      respiratoryRate: v.respiratoryRate ?? undefined,
      bloodGlucose: v.bloodGlucose ?? undefined,
      bloodGlucoseType: v.bloodGlucoseType || '',
      spo2: v.spo2 ?? undefined,
      spo2Context: v.spo2Context || '',
    },
    medicationsAdministered: input.medicationsAdministered || '',
    notes: input.notes || '',
    assessment: input.assessment || '',
    plan: input.plan || '',
  };
}

exports.createAdmission = async (req, res) => {
  try {
    const providerId = req.user.id;
    const {
      patient,
      hospitalName,
      admissionDate,
      reasonForHospitalization,
      observation,
    } = req.body;

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

    const admission = await HospitalAdmission.create({
      patient,
      provider: providerId,
      hospitalName,
      admissionDate: new Date(admissionDate),
      reasonForHospitalization,
      status: 'admitted',
      observations: [sanitizeObservationInput(observation || {}, providerId)],
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

    const query = {};

    // Provider sees admissions they created, plus any for patients they have full approved access to
    const fullAccessConnections = await Connection.find({
      provider: providerId,
      accessLevel: 'full',
      fullAccessStatus: 'approved',
    }).select('patient');
    const fullAccessPatientIds = fullAccessConnections.map(c => c.patient);

    query.$or = [
      { provider: providerId },
      { patient: { $in: fullAccessPatientIds } },
    ];

    if (patientId && mongoose.isValidObjectId(patientId)) {
      query.patient = patientId;
    }

    let admissions = await HospitalAdmission.find(query)
      .populate('patient', PATIENT_POPULATE)
      .populate('provider', PROVIDER_POPULATE)
      .sort({ admissionDate: -1, createdAt: -1 });

    if (search) {
      const needle = String(search).toLowerCase();
      admissions = admissions.filter(a => {
        const patientName = `${a.patient?.firstName || ''} ${a.patient?.lastName || ''}`.toLowerCase();
        return (
          patientName.includes(needle) ||
          (a.hospitalName || '').toLowerCase().includes(needle) ||
          (a.reasonForHospitalization || '').toLowerCase().includes(needle) ||
          (a.status || '').toLowerCase().includes(needle)
        );
      });
    }

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

    if (role === 'patient' && patientId !== userId) {
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

    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }

    const patientId = admission.patient._id.toString();
    if (role === 'patient' && patientId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (role === 'provider') {
      const isCreator = admission.provider._id.toString() === userId;
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

    const admission = await HospitalAdmission.findById(admissionId);
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }

    if (admission.status === 'discharged') {
      return res.status(400).json({ success: false, message: 'Cannot add observation to a discharged admission' });
    }

    const isCreator = admission.provider.toString() === providerId;
    if (!isCreator) {
      const hasAccess = await providerCanAccessPatient(providerId, admission.patient);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    admission.observations.push(sanitizeObservationInput(req.body || {}, providerId));
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

    const isCreator = admission.provider.toString() === providerId;
    if (!isCreator) {
      const hasAccess = await providerCanAccessPatient(providerId, admission.patient);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    admission.status = 'admitted';
    admission.dischargedAt = null;
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

    const admission = await HospitalAdmission.findById(admissionId);
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }
    if (admission.status === 'discharged') {
      return res.status(400).json({ success: false, message: 'Already discharged' });
    }

    const isCreator = admission.provider.toString() === providerId;
    if (!isCreator) {
      const hasAccess = await providerCanAccessPatient(providerId, admission.patient);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    admission.status = 'discharged';
    admission.dischargedAt = new Date();
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
