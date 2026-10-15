const logger = require('../utils/logger');
const { onboardProviderInitiatedPatient } = require('../services/patientOnboarding.service');

/**
 * Register a new (non-Onus) patient on behalf of a provider ("Add New Patient").
 * New and reused placeholder records start in PENDING_CONSENT and the patient
 * is emailed a consent request; see services/patientOnboarding.service.js for
 * duplicate matching (an existing account gets an access request instead).
 */
exports.registerNewPatient = async (req, res) => {
  try {
    const result = await onboardProviderInitiatedPatient({ provider: req.user, req, data: req.body });
    const { patient } = result;
    return res.status(result.status).json({
      ...result.body,
      ...(patient && result.status < 300 ? {
        patient: {
          _id: patient._id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patient.email || null,
        },
      } : {}),
    });
  } catch (error) {
    logger.error(`Register new patient error: ${error.message}`, { error });
    return res.status(500).json({ message: 'Server error while registering patient' });
  }
};
