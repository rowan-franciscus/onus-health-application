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
 *
 * Consent comes from the emailed link, or, for patients without email, from
 * a signed paper consent form the provider attaches. With a form the record
 * goes straight to ACTIVE (see consentService.grantWithConsentForm) and no
 * consent request is sent; a patient with an email only gets a claim link.
 * One of the two is required. A form never consents an existing record (a
 * real account or a reused placeholder): those follow the email path.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const User = require('../models/User');
const Connection = require('../models/Connection');
const PhysicalRecord = require('../models/PhysicalRecord');
const consentService = require('./consent.service');
const connectionService = require('./connection.service');
const {
  CONSENT_FORM_TYPES,
  consentFormError,
  sniffConsentFormType,
  physicalRecordsUploadDir
} = require('../middleware/upload.middleware');
const logger = require('../utils/logger');

const VALID_GENDERS = ['male', 'female', 'other', 'prefer not to say'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fail = (status, message, extra = {}) => ({ status, body: { success: false, message, ...extra } });

const EMAIL_OR_FORM_REQUIRED = "Enter the patient's email address or attach their signed consent form.";

/**
 * Write the checked in-memory upload to disk; returns the stored file details.
 * It goes with the physical-records uploads, so the authenticated
 * /api/files/physical-records route serves (and permission-checks) the form.
 */
const storeConsentForm = async (file) => {
  const mimetype = sniffConsentFormType(file.buffer);
  const filename = `consentForm-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${CONSENT_FORM_TYPES[mimetype]}`;
  await fs.promises.mkdir(physicalRecordsUploadDir, { recursive: true });
  const filePath = path.join(physicalRecordsUploadDir, filename);
  await fs.promises.writeFile(filePath, file.buffer, { flag: 'wx' });
  return {
    filename,
    originalName: String(file.originalname || filename).slice(0, 255),
    mimetype,
    size: file.size,
    path: filePath
  };
};

const validate = ({ firstName, lastName, gender, dateOfBirth, email }, consentForm) => {
  if (!firstName || !String(firstName).trim()) return 'First name is required';
  if (!lastName || !String(lastName).trim()) return 'Last name is required';
  if (!gender) return 'Gender is required';
  if (!VALID_GENDERS.includes(gender)) return 'Invalid gender value';
  if (!dateOfBirth) return 'Date of birth is required';
  if (!consentService.toDateKey(dateOfBirth)) return 'Invalid date of birth';
  if (email && !EMAIL_REGEX.test(String(email).trim().toLowerCase())) return 'Invalid email address';
  if (!(email && String(email).trim()) && !consentForm) return EMAIL_OR_FORM_REQUIRED;
  return consentFormError(consentForm);
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
 * @param {Object} [params.consentForm] - Signed consent form (multer memory
 *   file); required when there is no email
 * @returns {Promise<{status: number, body: Object, patient?: Object}>}
 */
const onboardProviderInitiatedPatient = async ({ provider, req, data, consentForm }) => {
  const error = validate(data, consentForm);
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
    const body = {
      success: true,
      outcome: 'access_request_sent',
      message: 'This patient already has an Onus Health account, so we sent them an access request instead of creating a new record.'
    };
    if (consentForm) {
      // Account holders give consent themselves; the paper form is not stored
      body.consentFormIgnored = true;
      body.message += ' The attached consent form was not used: they will approve access from their account.';
    }
    return { status: 200, patient: exactAccount, body };
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

  // A form only consents a record this onboarding created. A reused
  // placeholder may hold other providers' documents, so the patient confirms
  // by email (they have one: the match was on it) as with a real account
  if (consentForm && created) {
    return completeWithConsentForm({ provider, req, actorId, patient, created, connection, email, consentForm, emailOnly });
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
  if (consentForm) {
    body.consentFormIgnored = true;
    body.message += ' The attached consent form was not used because this patient already has a record on Onus Health.';
  }

  return { status: 201, body, patient };
};

/**
 * Store the signed form as the patient's document, record consent from it
 * and, if the patient has an email, send a claim link (no consent request).
 * Anything that fails undoes this onboarding so no half-consented record or
 * orphaned file is left behind.
 */
const completeWithConsentForm = async ({ provider, req, actorId, patient, created, connection, email, consentForm, emailOnly }) => {
  let stored;
  let record;
  try {
    stored = await storeConsentForm(consentForm);
    record = await PhysicalRecord.create({
      patient: patient._id,
      provider: provider._id,
      documentType: 'consent_form',
      description: 'Signed patient consent form',
      file: stored
    });
    const granted = await consentService.grantWithConsentForm(connection._id, { recordId: record._id, uploadedBy: actorId }, req);
    if (!granted.ok) throw new Error(`Consent form could not be recorded (${granted.code})`);
  } catch (err) {
    if (record) await PhysicalRecord.deleteOne({ _id: record._id });
    if (stored) await fs.promises.unlink(stored.path).catch(() => {});
    await Connection.deleteOne({ _id: connection._id });
    if (created) await User.deleteOne({ _id: patient._id });
    throw err;
  }

  let claimEmailSent = false;
  if (email) {
    ({ emailed: claimEmailSent } = await consentService.sendClaimInvite(connection._id, { req }));
  }

  logger.info(`Provider-initiated patient ${patient._id} (${created ? 'new' : 'existing placeholder'}) consented by uploaded form for provider ${provider._id}`);

  const body = {
    success: true,
    outcome: created ? 'created' : 'linked_existing_record',
    message: 'Patient added and marked as consented from their signed consent form.',
    consentStatus: 'ACTIVE',
    consentMethod: 'uploaded_form',
    consentEmailSent: false,
    claimEmailSent,
    connectionId: connection._id,
    consentFormRecordId: record._id
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
