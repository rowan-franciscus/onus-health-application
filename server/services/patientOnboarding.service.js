/**
 * Provider-initiated onboarding ("Add New Patient"), shared by providers and
 * Practice Admins.
 *
 * Duplicate matching uses email AND date of birth — never email alone, since
 * shared family emails are common:
 *   - email + DOB match a real patient account -> no new record; a standard
 *     access request (path 1) is sent instead
 *   - email + DOB match an unclaimed placeholder (e.g. created by another
 *     provider) -> reuse it; a new pending consent for this provider
 *   - email matches but DOB doesn't -> new record, plus a warning
 *   - no match -> new record
 * Records created or reused here start in PENDING_CONSENT for this provider;
 * the access-request case follows the existing path-1 rules instead.
 */

const User = require('../models/User');
const Connection = require('../models/Connection');
const consentService = require('./consent.service');
const connectionService = require('./connection.service');
const logger = require('../utils/logger');

const VALID_GENDERS = ['male', 'female', 'other', 'prefer not to say'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fail = (status, message, extra = {}) => ({ status, body: { success: false, message, ...extra } });

const validate = ({ firstName, lastName, gender, dateOfBirth, email }) => {
  if (!firstName || !String(firstName).trim()) return 'First name is required';
  if (!lastName || !String(lastName).trim()) return 'Last name is required';
  if (!gender) return 'Gender is required';
  if (!VALID_GENDERS.includes(gender)) return 'Invalid gender value';
  if (!dateOfBirth) return 'Date of birth is required';
  if (!consentService.toDateKey(dateOfBirth)) return 'Invalid date of birth';
  if (email && !EMAIL_REGEX.test(String(email).trim().toLowerCase())) return 'Invalid email address';
  return null;
};

/** Patients sharing this email, split by whether the DOB also matches. */
const matchPatients = async (email, dateOfBirth) => {
  if (!email) return { exact: [], emailOnly: [] };
  const candidates = await User.find({ email, role: 'patient' })
    .select('firstName lastName email isOnusUser patientProfile.dateOfBirth providerProfile');
  const exact = candidates.filter((u) => consentService.sameDob(dateOfBirth, u.patientProfile?.dateOfBirth));
  return { exact, emailOnly: candidates.filter((u) => !exact.includes(u)) };
};

const createPendingConnection = (patientId, providerId, initiatedBy, registration) => new Connection({
  patient: patientId,
  provider: providerId,
  initiatedBy,
  accessLevel: 'limited',
  fullAccessStatus: 'none',
  patientNotified: false,
  onboardingSource: 'provider_initiated',
  consent: { status: 'PENDING_CONSENT' },
  registration
}).save();

// The details this provider entered, kept on their connection (see utils/registrationDetails)
const registrationSnapshot = (data, email) => ({
  firstName: String(data.firstName).trim(),
  lastName: String(data.lastName).trim(),
  email: email || undefined,
  phone: data.phone ? String(data.phone).trim() : undefined,
  dateOfBirth: new Date(consentService.toDateKey(data.dateOfBirth)),
  gender: data.gender,
  insurance: {
    provider: data.medicalAidProvider ? String(data.medicalAidProvider).trim() : undefined,
    plan: data.plan ? String(data.plan).trim() : undefined
  }
});

/**
 * @param {Object} params
 * @param {Object} params.provider - Treating provider user document
 * @param {Object} params.req - Express request (acting user, audit context)
 * @param {Object} params.data - Form fields: firstName, lastName, gender,
 *   dateOfBirth, phone, email, medicalAidProvider, plan
 * @returns {Promise<{status: number, body: Object, patient?: Object}>}
 */
const onboardProviderInitiatedPatient = async ({ provider, req, data }) => {
  const error = validate(data);
  if (error) return fail(400, error);

  const email = data.email ? String(data.email).trim().toLowerCase() : null;
  const actorId = req.user._id || req.user.id;
  const { exact, emailOnly } = await matchPatients(email, data.dateOfBirth);

  // A real account wins over a placeholder if both match
  const exactAccount = exact.find((u) => u.isOnusUser !== false);
  const exactPlaceholder = exact.find((u) => u.isOnusUser === false);
  const existingMatch = exactAccount || exactPlaceholder;

  if (existingMatch) {
    const existingConn = await Connection.exists({ patient: existingMatch._id, provider: provider._id });
    if (existingConn) {
      return fail(409, 'This patient is already in your patient list.');
    }
  }

  if (exactAccount) {
    await connectionService.createAccessRequest({
      provider,
      patient: exactAccount,
      initiatedBy: actorId,
      fullAccessRequested: true
    });
    logger.info(`Add New Patient matched account ${exactAccount._id}; access request sent by provider ${provider._id}`);
    return {
      status: 200,
      patient: exactAccount,
      body: {
        success: true,
        outcome: 'access_request_sent',
        message: 'This patient already has an Onus Health account, so we sent them an access request instead of creating a new record.'
      }
    };
  }

  let patient = exactPlaceholder;
  let created = false;
  if (!patient) {
    patient = new User({
      firstName: String(data.firstName).trim(),
      lastName: String(data.lastName).trim(),
      email: email || undefined,
      phone: data.phone ? String(data.phone).trim() : undefined,
      role: 'patient',
      isOnusUser: false,
      isEmailVerified: false,
      isProfileCompleted: false,
      registeredBy: provider._id,
      patientProfile: {
        dateOfBirth: new Date(consentService.toDateKey(data.dateOfBirth)),
        gender: data.gender,
        insurance: {
          provider: data.medicalAidProvider ? String(data.medicalAidProvider).trim() : undefined,
          plan: data.plan ? String(data.plan).trim() : undefined
        }
      }
    });
    await patient.save();
    created = true;
  }

  let connection;
  try {
    connection = await createPendingConnection(patient._id, provider._id, actorId, registrationSnapshot(data, email));
  } catch (err) {
    if (created) {
      await User.deleteOne({ _id: patient._id });
    }
    throw err;
  }

  let consentEmailSent = false;
  if (email) {
    ({ emailed: consentEmailSent } = await consentService.sendConsentInvite(connection._id, { req }));
  }

  logger.info(`Provider-initiated patient ${patient._id} (${created ? 'new' : 'existing placeholder'}) pending consent for provider ${provider._id}`);

  const body = {
    success: true,
    outcome: created ? 'created' : 'linked_existing_record',
    message: consentEmailSent
      ? 'Patient added. They have been emailed a consent request; you can add clinical information once they consent.'
      : 'Patient added. They have no email address on file, so they cannot be sent a consent request yet.',
    consentStatus: 'PENDING_CONSENT',
    consentEmailSent,
    connectionId: connection._id
  };
  if (created && emailOnly.length > 0) {
    body.warning = 'EMAIL_IN_USE_DIFFERENT_DOB';
    body.warningMessage = 'Another patient record uses this email address with a different date of birth. A separate record was created — check this is not the same person.';
  }

  return { status: 201, body, patient };
};

module.exports = {
  onboardProviderInitiatedPatient
};
