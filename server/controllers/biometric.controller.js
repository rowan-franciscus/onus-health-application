const mongoose = require('mongoose');
const Biometric = require('../models/Biometric');
const Connection = require('../models/Connection');

const PATIENT_POPULATE = 'firstName lastName email profileImage patientProfile';
const PROVIDER_POPULATE = 'firstName lastName email providerProfile';

async function providerCanAccessPatient(providerId, patientId) {
  const connection = await Connection.findOne({ provider: providerId, patient: patientId });
  return Boolean(connection);
}

exports.createBiometric = async (req, res) => {
  try {
    const { patientId } = req.params;
    const providerId = req.user.id;

    if (!mongoose.isValidObjectId(patientId)) {
      return res.status(400).json({ success: false, message: 'Invalid patient ID' });
    }

    const { date, weight, height, bodyFatPercentage } = req.body;

    if (!date || weight === undefined || weight === null || weight === '' ||
        height === undefined || height === null || height === '') {
      return res.status(400).json({ success: false, message: 'Missing required fields: date, weight, height' });
    }

    const weightNum = Number(weight);
    const heightNum = Number(height);

    if (!Number.isFinite(weightNum) || weightNum <= 0 ||
        !Number.isFinite(heightNum) || heightNum <= 0) {
      return res.status(400).json({ success: false, message: 'Weight and height must be positive numbers' });
    }

    const hasAccess = await providerCanAccessPatient(providerId, patientId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'No connection to this patient' });
    }

    const bmi = Math.round((weightNum / Math.pow(heightNum / 100, 2)) * 10) / 10;

    const biometricData = {
      patient: patientId,
      provider: providerId,
      date: new Date(date),
      weight: weightNum,
      height: heightNum,
      bmi,
    };

    if (bodyFatPercentage !== undefined && bodyFatPercentage !== null && bodyFatPercentage !== '') {
      const bfNum = Number(bodyFatPercentage);
      if (!Number.isFinite(bfNum) || bfNum < 0 || bfNum > 100) {
        return res.status(400).json({ success: false, message: 'Body fat percentage must be a number between 0 and 100' });
      }
      biometricData.bodyFatPercentage = bfNum;
    }

    const biometric = await Biometric.create(biometricData);

    const populated = await Biometric.findById(biometric._id)
      .populate('patient', PATIENT_POPULATE)
      .populate('provider', PROVIDER_POPULATE);

    return res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating biometric record:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.listBiometricsForPatient = async (req, res) => {
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

    const biometrics = await Biometric.find({ patient: patientId })
      .populate('patient', PATIENT_POPULATE)
      .populate('provider', PROVIDER_POPULATE)
      .sort({ date: -1, createdAt: -1 });

    return res.json(biometrics);
  } catch (error) {
    console.error('Error listing biometric records:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
