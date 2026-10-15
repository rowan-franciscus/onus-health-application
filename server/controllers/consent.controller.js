/**
 * Consent controller — public consent links (no account needed) and the
 * signed-in patient's consent management. State changes are delegated to
 * services/consent.service.js.
 */

const Connection = require('../models/Connection');
const consentService = require('../services/consent.service');
const { getConsentText } = require('../config/consentText');
const logger = require('../utils/logger');

// Service result codes -> HTTP status + patient-facing message
const RESPONSES = {
  INVALID_DECISION: [400, 'Please choose to accept or decline.'],
  INVALID_TEXT_VERSION: [400, 'Please reload the page and try again.'],
  INVALID_DOB: [400, 'Please enter a valid date of birth.'],
  INVALID_TOKEN: [404, 'This link is no longer valid. It may have already been used.'],
  EXPIRED: [410, 'This link has expired. Please ask your provider to send a new one.'],
  DOB_MISMATCH: [422, 'That date of birth does not match our records.'],
  LOCKED: [423, 'Too many incorrect attempts. This link has been disabled; please ask your provider to send a new one.'],
  NOT_PENDING: [409, 'There is no pending consent request to respond to.'],
  NOT_ACTIVE: [409, 'Consent is not currently active for this provider.']
};

const sendFailure = (res, result) => {
  const [status, message] = RESPONSES[result.code] || [400, 'Request could not be completed.'];
  const { ok, ...rest } = result;
  return res.status(status).json({ success: false, message, ...rest });
};

// ---- Public (token) endpoints ----

/** GET /api/consent/:token */
exports.getConsentRequest = async (req, res) => {
  try {
    const result = await consentService.getConsentRequest(req.params.token, req);
    if (result.state === 'expired') return sendFailure(res, { code: 'EXPIRED' });
    if (result.state !== 'valid') return sendFailure(res, { code: 'INVALID_TOKEN' });
    const { state, ...request } = result;
    res.json({ success: true, ...request });
  } catch (error) {
    logger.error('Error loading consent request:', error);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

/** POST /api/consent/:token/respond { dateOfBirth, decision, textVersion } */
exports.respondToConsentRequest = async (req, res) => {
  try {
    const { dateOfBirth, decision, textVersion } = req.body || {};
    const result = await consentService.respondWithToken(
      req.params.token,
      { dateOfBirth, decision, textVersion },
      req
    );
    if (!result.ok) return sendFailure(res, result);
    res.json({ success: true, status: result.status, claimUrl: result.claimUrl });
  } catch (error) {
    logger.error('Error responding to consent request:', error);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

// ---- Signed-in patient endpoints ----

/** GET /api/connections/patient/consents */
exports.getMyConsents = async (req, res) => {
  try {
    const patientId = req.user._id || req.user.id;
    await consentService.expireStale({ patient: patientId });
    const connections = await Connection.find({ patient: patientId, onboardingSource: 'provider_initiated' })
      .populate('provider', 'firstName lastName title providerProfile.specialty providerProfile.practiceInfo.name')
      .sort({ createdAt: -1 });

    const consents = connections.filter((c) => c.provider).map((c) => ({
      connectionId: c._id,
      provider: {
        _id: c.provider._id,
        name: consentService.providerDisplayName(c.provider),
        specialty: c.provider.providerProfile?.specialty,
        practiceName: c.provider.providerProfile?.practiceInfo?.name
      },
      status: c.consent.status,
      requestedAt: c.consent.firstInviteSentAt || c.createdAt,
      respondedAt: c.consent.respondedAt,
      withdrawnAt: c.consent.withdrawnAt,
      textVersion: c.consent.textVersion
    }));

    res.json({ success: true, consents, consentText: getConsentText() });
  } catch (error) {
    logger.error('Error loading patient consents:', error);
    res.status(500).json({ success: false, message: 'Failed to load consents' });
  }
};

/** POST /api/connections/patient/consent/:connectionId/respond { decision, textVersion } */
exports.respondAsPatient = async (req, res) => {
  try {
    const result = await consentService.respondAsPatient(
      req.params.connectionId,
      req.user._id || req.user.id,
      req.body || {},
      req
    );
    if (!result.ok) return sendFailure(res, result);
    res.json({ success: true, status: result.status });
  } catch (error) {
    logger.error('Error responding to consent from account:', error);
    res.status(500).json({ success: false, message: 'Failed to record your response' });
  }
};

/** POST /api/connections/patient/consent/:connectionId/withdraw */
exports.withdrawConsent = async (req, res) => {
  try {
    const result = await consentService.withdraw(req.params.connectionId, req.user._id || req.user.id, req);
    if (!result.ok) return sendFailure(res, result);
    res.json({ success: true, status: result.status });
  } catch (error) {
    logger.error('Error withdrawing consent:', error);
    res.status(500).json({ success: false, message: 'Failed to withdraw consent' });
  }
};
