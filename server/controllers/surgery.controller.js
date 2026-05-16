const mongoose = require('mongoose');
const Surgery = require('../models/Surgery');
const Connection = require('../models/Connection');

const PATIENT_POPULATE = 'firstName lastName email profileImage patientProfile';
const PROVIDER_POPULATE = 'firstName lastName email providerProfile';

// Any connection suffices for read access; full approved access required for mutations.
async function providerCanAccessPatient(providerId, patientId) {
  const connection = await Connection.findOne({ provider: providerId, patient: patientId });
  return Boolean(connection);
}

async function providerCanMutateSurgery(providerId, patientId) {
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

const NOTE_TYPES = ['pre-op', 'intra-op', 'post-op', 'general'];

function sanitizeNoteInput(input = {}, recordedBy) {
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

  const noteType = NOTE_TYPES.includes(input.noteType) ? input.noteType : 'general';

  return {
    recordedBy,
    recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
    noteType,
    noteContent: input.noteContent || '',
    vitals: { heartRate, bpSystolic, bpDiastolic, temperature, respiratoryRate, bloodGlucose, bloodGlucoseType, spo2, spo2Context },
    medications: input.medications || '',
    complications: input.complications || '',
    recoveryNotes: input.recoveryNotes || '',
    generalNotes: input.generalNotes || '',
  };
}

// Returns true when the note carries at least one meaningful piece of clinical data.
function hasNoteContent(input = {}) {
  const v = input.vitals || {};
  return (
    toNum(v.heartRate) !== undefined ||
    toNum(v.bpSystolic) !== undefined ||
    toNum(v.bpDiastolic) !== undefined ||
    toNum(v.temperature) !== undefined ||
    toNum(v.respiratoryRate) !== undefined ||
    toNum(v.bloodGlucose) !== undefined ||
    toNum(v.spo2) !== undefined ||
    !!(input.noteContent || '').trim() ||
    !!(input.medications || '').trim() ||
    !!(input.complications || '').trim() ||
    !!(input.recoveryNotes || '').trim() ||
    !!(input.generalNotes || '').trim()
  );
}

exports.createSurgery = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { patient, surgeryType, date, reason, leadSurgeon, anaesthesiologist, note } = req.body;

    if (!patient || !surgeryType || !date || !reason) {
      return res.status(400).json({ success: false, message: 'Missing required surgery fields' });
    }
    if (!mongoose.isValidObjectId(patient)) {
      return res.status(400).json({ success: false, message: 'Invalid patient ID' });
    }

    const hasAccess = await providerCanAccessPatient(providerId, patient);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'No connection to this patient' });
    }

    // Only seed an initial note when the provider actually filled something in.
    const notes = hasNoteContent(note || {})
      ? [sanitizeNoteInput(note, providerId)]
      : [];

    const surgery = await Surgery.create({
      patient,
      provider: providerId,
      surgeryType,
      date: new Date(date),
      reason,
      leadSurgeon: leadSurgeon || '',
      anaesthesiologist: anaesthesiologist || '',
      status: 'open',
      notes,
    });

    const populated = await Surgery.findById(surgery._id)
      .populate('patient', PATIENT_POPULATE)
      .populate('provider', PROVIDER_POPULATE)
      .populate('notes.recordedBy', PROVIDER_POPULATE);

    return res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating surgery record:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.listSurgeriesForProvider = async (req, res) => {
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
            { surgeryType: regex },
            { leadSurgeon: regex },
            { status: regex },
          ],
        },
      });
    }

    pipeline.push({ $sort: { date: -1, createdAt: -1 } });

    const raw = await Surgery.aggregate(pipeline);

    // Populate provider and recordedBy via mongoose after aggregation.
    const ids = raw.map(s => s._id);
    const surgeries = await Surgery.find({ _id: { $in: ids } })
      .populate('patient', PATIENT_POPULATE)
      .populate('provider', PROVIDER_POPULATE)
      .sort({ date: -1, createdAt: -1 });

    const result = surgeries.map(s => {
      const obj = s.toObject({ virtuals: true });
      obj.noteCount = s.notes.length;
      return obj;
    });

    return res.json(result);
  } catch (error) {
    console.error('Error listing surgeries:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.listSurgeriesForPatient = async (req, res) => {
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

    const surgeries = await Surgery.find({ patient: patientId })
      .populate('patient', PATIENT_POPULATE)
      .populate('provider', PROVIDER_POPULATE)
      .sort({ date: -1, createdAt: -1 });

    const result = surgeries.map(s => {
      const obj = s.toObject({ virtuals: true });
      obj.noteCount = s.notes.length;
      return obj;
    });

    return res.json(result);
  } catch (error) {
    console.error('Error listing patient surgeries:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSurgeryById = async (req, res) => {
  try {
    const { surgeryId } = req.params;
    const { id: userId, role } = req.user;

    if (!mongoose.isValidObjectId(surgeryId)) {
      return res.status(400).json({ success: false, message: 'Invalid surgery ID' });
    }

    const surgery = await Surgery.findById(surgeryId)
      .populate('patient', PATIENT_POPULATE)
      .populate('provider', PROVIDER_POPULATE)
      .populate('notes.recordedBy', PROVIDER_POPULATE);

    if (!surgery) {
      return res.status(404).json({ success: false, message: 'Surgery record not found' });
    }

    const patientId = surgery.patient._id.toString();
    if (role === 'patient' && String(patientId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (role === 'provider') {
      const isCreator = surgery.provider._id.toString() === String(userId);
      if (!isCreator) {
        const hasAccess = await providerCanAccessPatient(userId, patientId);
        if (!hasAccess) {
          return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
      }
    }

    return res.json(surgery);
  } catch (error) {
    console.error('Error fetching surgery record:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.addNote = async (req, res) => {
  try {
    const { surgeryId } = req.params;
    const providerId = req.user.id;

    if (!hasNoteContent(req.body || {})) {
      return res.status(400).json({ success: false, message: 'Note must include at least one vital, note, medication, complication, or recovery detail' });
    }

    const surgery = await Surgery.findById(surgeryId);
    if (!surgery) {
      return res.status(404).json({ success: false, message: 'Surgery record not found' });
    }
    if (surgery.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Cannot add a note to a closed surgery record' });
    }

    const isCreator = surgery.provider.toString() === String(providerId);
    if (!isCreator) {
      const hasAccess = await providerCanMutateSurgery(providerId, surgery.patient);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    surgery.notes.push(sanitizeNoteInput(req.body, providerId));
    await surgery.save();

    const populated = await Surgery.findById(surgery._id)
      .populate('patient', PATIENT_POPULATE)
      .populate('provider', PROVIDER_POPULATE)
      .populate('notes.recordedBy', PROVIDER_POPULATE);

    return res.status(201).json(populated);
  } catch (error) {
    console.error('Error adding surgery note:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.reopenSurgery = async (req, res) => {
  try {
    const { surgeryId } = req.params;
    const providerId = req.user.id;

    const surgery = await Surgery.findById(surgeryId);
    if (!surgery) {
      return res.status(404).json({ success: false, message: 'Surgery record not found' });
    }
    if (surgery.status === 'open') {
      return res.status(400).json({ success: false, message: 'Surgery record is already open' });
    }

    const isCreator = surgery.provider.toString() === String(providerId);
    if (!isCreator) {
      const hasAccess = await providerCanMutateSurgery(providerId, surgery.patient);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    surgery.status = 'open';
    surgery.closedAt = null;
    await surgery.save();

    const populated = await Surgery.findById(surgery._id)
      .populate('patient', PATIENT_POPULATE)
      .populate('provider', PROVIDER_POPULATE)
      .populate('notes.recordedBy', PROVIDER_POPULATE);

    return res.json(populated);
  } catch (error) {
    console.error('Error reopening surgery record:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.closeSurgery = async (req, res) => {
  try {
    const { surgeryId } = req.params;
    const providerId = req.user.id;

    const surgery = await Surgery.findById(surgeryId);
    if (!surgery) {
      return res.status(404).json({ success: false, message: 'Surgery record not found' });
    }
    if (surgery.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Surgery record is already closed' });
    }

    const isCreator = surgery.provider.toString() === String(providerId);
    if (!isCreator) {
      const hasAccess = await providerCanMutateSurgery(providerId, surgery.patient);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    surgery.status = 'closed';
    surgery.closedAt = new Date();
    await surgery.save();

    const populated = await Surgery.findById(surgery._id)
      .populate('patient', PATIENT_POPULATE)
      .populate('provider', PROVIDER_POPULATE)
      .populate('notes.recordedBy', PROVIDER_POPULATE);

    return res.json(populated);
  } catch (error) {
    console.error('Error closing surgery record:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
