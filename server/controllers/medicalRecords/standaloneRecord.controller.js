/**
 * Standalone Medical Record Controller
 *
 * Creates individual medical records independently of any consultation.
 * Records are stored with `consultation: null` and surfaced on the patient's
 * record tabs via the existing discriminator-based queries.
 */

const mongoose = require('mongoose');
const Connection = require('../../models/Connection');
const ImmunizationRecord = require('../../models/ImmunizationRecord');
const HospitalRecord = require('../../models/HospitalRecord');
const SurgeryRecord = require('../../models/SurgeryRecord');

const createStandaloneRecord = (Model, recordLabel) => async (req, res) => {
  try {
    const providerId = req.user.id;
    const { patientId, ...recordData } = req.body;

    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid patientId is required'
      });
    }

    const connection = await Connection.findOne({
      provider: providerId,
      patient: patientId
    });

    if (!connection) {
      return res.status(403).json({
        success: false,
        message: 'No connection to this patient'
      });
    }

    const record = new Model({
      ...recordData,
      patient: patientId,
      provider: providerId,
      consultation: null,
      date: recordData.date || new Date()
    });

    await record.save();
    await record.populate('patient', 'firstName lastName');

    return res.status(201).json({
      success: true,
      record
    });
  } catch (error) {
    console.error(`Error creating standalone ${recordLabel} record:`, error);
    return res.status(500).json({
      success: false,
      message: `Failed to create ${recordLabel} record`,
      error: error.message
    });
  }
};

module.exports = {
  createImmunization: createStandaloneRecord(ImmunizationRecord, 'immunization'),
  createHospitalRecord: createStandaloneRecord(HospitalRecord, 'hospital'),
  createSurgeryRecord: createStandaloneRecord(SurgeryRecord, 'surgery')
};
