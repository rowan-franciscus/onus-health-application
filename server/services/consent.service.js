/**
 * Consent Service — the single place where Connection.consent changes.
 *
 * Provider-initiated onboarding (Add New Patient) creates a Connection in
 * PENDING_CONSENT. The patient is emailed a single-use consent link; only an
 * accepted consent (ACTIVE) lets the provider act on the record.
 *
 *   PENDING_CONSENT --accept--> ACTIVE --withdraw--> WITHDRAWN
 *   PENDING_CONSENT --decline-> DECLINED
 *   PENDING_CONSENT --14 days-> EXPIRED --resend--> PENDING_CONSENT
 *
 * Tokens: 32 random bytes, emailed raw, stored only as SHA-256. Transitions
 * are a single conditional findOneAndUpdate so a link can be used once even
 * under concurrent submits. Every transition writes a 'consent' audit event
 * carrying the consent text version (in context.after, which is hashed).
 */

const crypto = require('crypto');
const Connection = require('../models/Connection');
const User = require('../models/User');
const Practice = require('../models/Practice');
const auditService = require('./audit.service');
const emailService = require('./email.service');
const config = require('../config/environment');
const logger = require('../utils/logger');
const { CURRENT_VERSION, versions: consentTextVersions, getConsentText } = require('../config/consentText');

const DAY_MS = 24 * 60 * 60 * 1000;
const CONSENT_TOKEN_TTL_MS = 14 * DAY_MS;
const CLAIM_TOKEN_TTL_MS = 90 * DAY_MS;
const MAX_DOB_ATTEMPTS = 5;
// Live claim links kept per patient (emailed + confirmation-screen links)
const MAX_CLAIM_TOKENS = 5;

const DEFERRAL_REASONS = ['no_phone', 'no_email_access', 'no_email_address', 'declined_verbally', 'other'];

// States in which the patient has not yet answered and a link can be (re)sent
const AWAITING_STATUSES = ['PENDING_CONSENT', 'EXPIRED'];

const hashToken = (raw) => crypto.createHash('sha256').update(String(raw)).digest('hex');
const newToken = () => {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hash: hashToken(raw) };
};

const idOf = (ref) => (ref && ref._id ? ref._id : ref);

/**
 * Calendar date of a DOB as 'YYYY-MM-DD'. A 'YYYY-MM-DD…' string keeps the
 * date the person typed (ignoring any time/offset); a Date uses its UTC date,
 * which is how DOBs are stored (new Date('YYYY-MM-DD') is UTC midnight).
 */
const toDateKey = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const sameDob = (a, b) => {
  const ka = toDateKey(a);
  return Boolean(ka) && ka === toDateKey(b);
};

const consentUrl = (raw) => `${config.frontendUrl}/consent/${raw}`;
const claimUrl = (raw) => `${config.frontendUrl}/claim/${raw}`;

// ---- Audit ----

/**
 * Append a consent audit event. Provider ID and consent text version live in
 * context.after, which is part of the hash-chained canonical form.
 */
const logConsentEvent = (req, {
  subtype, connection, before, after, agent, outcome = '0', outcomeDesc, textVersion
}) => {
  const event = {
    type: 'consent',
    subtype,
    action: 'U',
    outcome,
    outcomeDesc,
    entity: {
      resourceType: 'Connection',
      resourceId: connection._id,
      patientId: idOf(connection.patient)
    },
    agent,
    context: {
      connectionId: connection._id,
      before: before ? { consentStatus: before } : undefined,
      after: {
        consentStatus: after,
        providerId: String(idOf(connection.provider)),
        consentTextVersion: textVersion || undefined
      }
    }
  };
  if (req) {
    auditService.logFromRequest(req, event);
  } else {
    auditService.log({ ...event, agent: agent || { userId: null, role: 'system' } });
  }
};

// The patient acting through an emailed link has no session: attribute the
// event to the patient (identity checked by token + DOB)
const patientAgent = (connection) => ({ userId: idOf(connection.patient), role: 'patient' });

// ---- Display helpers ----

const practiceNameFor = async (provider) => {
  const practiceId = provider?.providerProfile?.practiceId;
  if (practiceId) {
    const practice = await Practice.findById(practiceId).select('name').lean();
    if (practice?.name) return practice.name;
  }
  return provider?.providerProfile?.practiceInfo?.name || null;
};

const providerDisplayName = (provider) =>
  [provider?.title, provider?.firstName, provider?.lastName].filter(Boolean).join(' ');

// ---- Claim tokens ----

/**
 * Issue a claim link for an unclaimed placeholder patient. Keeps the newest
 * MAX_CLAIM_TOKENS live hashes and drops expired ones. Returns the raw token,
 * or null if the patient has already claimed their record.
 */
const issueClaimToken = async (patientId) => {
  const patient = await User.findById(patientId).select('isOnusUser claimTokens');
  if (!patient || patient.isOnusUser !== false) return null;

  const { raw, hash } = newToken();
  const now = Date.now();
  const live = (patient.claimTokens || []).filter((t) => t.expires.getTime() > now);
  live.push({ hash, expires: new Date(now + CLAIM_TOKEN_TTL_MS) });
  patient.claimTokens = live.slice(-MAX_CLAIM_TOKENS);
  await patient.save();
  return raw;
};

/** Unclaimed placeholder patient owning a live claim token, or null. */
const findPatientByClaimToken = async (raw) => {
  if (!raw) return null;
  return User.findOne({
    role: 'patient',
    isOnusUser: false,
    claimTokens: { $elemMatch: { hash: hashToken(raw), expires: { $gt: new Date() } } }
  });
};

// ---- Invites ----

/**
 * Issue a fresh consent token (replacing any previous one) plus a claim link,
 * and email the patient. Used for the first invite and for resends.
 * Returns { emailed } — false when the patient has no email address.
 */
const sendConsentInvite = async (connectionId, { req, isResend = false } = {}) => {
  const connection = await Connection.findById(connectionId)
    .populate('patient', 'firstName lastName email isOnusUser')
    .populate('provider', 'firstName lastName title providerProfile');
  if (!connection) throw new Error('Connection not found');

  const { raw, hash } = newToken();
  const now = new Date();
  const before = connection.consent.status;

  const set = {
    'consent.status': 'PENDING_CONSENT',
    'consent.tokenHash': hash,
    'consent.tokenExpires': new Date(now.getTime() + CONSENT_TOKEN_TTL_MS),
    'consent.dobAttempts': 0,
    'consent.inviteSentAt': now
  };
  if (!connection.consent.firstInviteSentAt) set['consent.firstInviteSentAt'] = now;

  const updated = await Connection.findOneAndUpdate(
    { _id: connection._id, 'consent.status': { $in: AWAITING_STATUSES } },
    { $set: set, ...(isResend ? { $inc: { 'consent.resendCount': 1 } } : {}) },
    { new: true }
  );
  if (!updated) {
    const error = new Error('Consent can only be requested while pending or expired');
    error.code = 'INVALID_CONSENT_STATE';
    throw error;
  }

  logConsentEvent(req, {
    subtype: isResend ? 'consent-invite-resent' : 'consent-invite-sent',
    connection: updated,
    before,
    after: 'PENDING_CONSENT',
    textVersion: CURRENT_VERSION
  });

  const patient = connection.patient;
  if (!patient?.email) {
    return { emailed: false };
  }

  const rawClaim = await issueClaimToken(patient._id);
  const provider = connection.provider;
  const providerName = providerDisplayName(provider);
  const practiceName = await practiceNameFor(provider);
  const expiresOn = set['consent.tokenExpires'].toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  });

  try {
    await emailService.sendTemplateEmail(
      patient.email,
      'consentRequest',
      {
        title: 'Your consent is needed',
        patientFirstName: patient.firstName,
        providerName,
        practiceName,
        consentUrl: consentUrl(raw),
        claimUrl: rawClaim ? claimUrl(rawClaim) : null,
        expiresOn
      },
      {
        subject: `${providerName} is asking for your consent on Onus Health`,
        userId: patient._id,
        queue: true
      }
    );
  } catch (error) {
    logger.error(`Failed to queue consent email for connection ${connection._id}:`, error);
    return { emailed: false };
  }
  return { emailed: true };
};

// ---- Token lookup and expiry ----

const markExpired = async (connection, req) => {
  const updated = await Connection.findOneAndUpdate(
    { _id: connection._id, 'consent.status': 'PENDING_CONSENT', 'consent.tokenExpires': { $lte: new Date() } },
    { $set: { 'consent.status': 'EXPIRED' }, $unset: { 'consent.tokenHash': 1 } },
    { new: true }
  );
  if (!updated) return null;

  if (!updated.consent.expiredAt) {
    await Connection.updateOne(
      { _id: updated._id, 'consent.expiredAt': { $exists: false } },
      { $set: { 'consent.expiredAt': updated.consent.tokenExpires || new Date() } }
    );
  }
  logConsentEvent(req, {
    subtype: 'consent-expired',
    connection: updated,
    before: 'PENDING_CONSENT',
    after: 'EXPIRED',
    agent: { userId: null, role: 'system' }
  });
  return updated;
};

/**
 * Transition every pending consent whose link has lapsed to EXPIRED.
 * Called lazily (patient lists, report, token lookup) instead of a cron.
 */
const expireStale = async (filter = {}) => {
  const stale = await Connection.find({
    ...filter,
    'consent.status': 'PENDING_CONSENT',
    'consent.tokenExpires': { $lte: new Date() }
  }).select('_id patient provider consent.status');
  for (const connection of stale) {
    // System-attributed: lazily triggered expiry is not the caller's action
    await markExpired(connection, null);
  }
  return stale.length;
};

/**
 * Resolve a raw consent token. Returns { state, connection } where state is
 * 'valid' | 'expired' | 'invalid'. Used, locked and unknown tokens are all
 * 'invalid' so the response does not reveal which.
 */
const lookupConsentToken = async (raw, req) => {
  if (!raw || typeof raw !== 'string') return { state: 'invalid' };
  const connection = await Connection.findOne({ 'consent.tokenHash': hashToken(raw) })
    .populate('patient', 'firstName isOnusUser patientProfile.dateOfBirth')
    .populate('provider', 'firstName lastName title providerProfile');
  if (!connection || connection.consent.status !== 'PENDING_CONSENT') {
    return { state: 'invalid' };
  }
  if (connection.consent.tokenExpires && connection.consent.tokenExpires <= new Date()) {
    await markExpired(connection, req);
    return { state: 'expired' };
  }
  return { state: 'valid', connection };
};

/** Public view of a pending consent request — no PHI beyond first name. */
const getConsentRequest = async (raw, req) => {
  const { state, connection } = await lookupConsentToken(raw, req);
  if (state !== 'valid') return { state };
  return {
    state,
    patientFirstName: connection.patient?.firstName,
    providerName: providerDisplayName(connection.provider),
    practiceName: await practiceNameFor(connection.provider),
    consentText: getConsentText(),
    attemptsRemaining: MAX_DOB_ATTEMPTS - (connection.consent.dobAttempts || 0)
  };
};

// ---- Responses ----

const notifyProvider = async (connection, outcome) => {
  const templates = {
    ACTIVE: { name: 'consentGranted', subject: 'has given consent' },
    DECLINED: { name: 'consentDeclined', subject: 'has declined consent' },
    WITHDRAWN: { name: 'consentWithdrawn', subject: 'has withdrawn consent' }
  };
  const template = templates[outcome];
  if (!template) return;
  try {
    const [provider, patient] = await Promise.all([
      User.findById(idOf(connection.provider)).select('firstName email'),
      User.findById(idOf(connection.patient)).select('firstName lastName')
    ]);
    if (!provider?.email) return;
    const patientName = `${patient.firstName} ${patient.lastName}`;
    await emailService.sendTemplateEmail(
      provider.email,
      template.name,
      {
        title: `Patient ${template.subject}`,
        providerFirstName: provider.firstName,
        patientName,
        patientUrl: `${config.frontendUrl}/provider/patients/${idOf(connection.patient)}`
      },
      { subject: `${patientName} ${template.subject}`, userId: provider._id, queue: true }
    );
  } catch (error) {
    logger.error(`Failed to notify provider of consent ${outcome} on ${connection._id}:`, error);
  }
};

const DECISIONS = { accept: 'ACTIVE', decline: 'DECLINED' };

/** Error code for an unknown decision or consent text version, else null. */
const decisionError = (decision, textVersion) => {
  if (!DECISIONS[decision]) return 'INVALID_DECISION';
  if (!consentTextVersions[textVersion]) return 'INVALID_TEXT_VERSION';
  return null;
};

const decisionSubtype = (toStatus) => (toStatus === 'ACTIVE' ? 'consent-granted' : 'consent-declined');

/**
 * Patient responds through the emailed link. The DOB must match the record;
 * after MAX_DOB_ATTEMPTS mismatches the link is invalidated and the provider
 * must resend. Returns { ok, status, claimUrl } or { ok: false, code, … }.
 */
const respondWithToken = async (raw, { dateOfBirth, decision, textVersion }, req) => {
  const invalid = decisionError(decision, textVersion);
  if (invalid) return { ok: false, code: invalid };
  if (!toDateKey(dateOfBirth)) return { ok: false, code: 'INVALID_DOB' };

  const { state, connection } = await lookupConsentToken(raw, req);
  if (state === 'expired') return { ok: false, code: 'EXPIRED' };
  if (state !== 'valid') return { ok: false, code: 'INVALID_TOKEN' };

  const toStatus = DECISIONS[decision];
  const hash = hashToken(raw);

  if (!sameDob(dateOfBirth, connection.patient?.patientProfile?.dateOfBirth)) {
    const counted = await Connection.findOneAndUpdate(
      { _id: connection._id, 'consent.tokenHash': hash, 'consent.status': 'PENDING_CONSENT' },
      { $inc: { 'consent.dobAttempts': 1 } },
      { new: true }
    );
    const attempts = counted ? counted.consent.dobAttempts : MAX_DOB_ATTEMPTS;
    logConsentEvent(req, {
      subtype: 'consent-dob-mismatch',
      connection,
      before: 'PENDING_CONSENT',
      after: 'PENDING_CONSENT',
      agent: { userId: null, role: 'anonymous' },
      outcome: '4',
      outcomeDesc: 'dob-mismatch'
    });
    if (attempts >= MAX_DOB_ATTEMPTS) {
      await Connection.updateOne(
        { _id: connection._id, 'consent.tokenHash': hash },
        { $unset: { 'consent.tokenHash': 1, 'consent.tokenExpires': 1 } }
      );
      logConsentEvent(req, {
        subtype: 'consent-link-locked',
        connection,
        before: 'PENDING_CONSENT',
        after: 'PENDING_CONSENT',
        agent: { userId: null, role: 'anonymous' },
        outcome: '4',
        outcomeDesc: 'too-many-dob-attempts'
      });
      return { ok: false, code: 'LOCKED' };
    }
    return { ok: false, code: 'DOB_MISMATCH', attemptsRemaining: MAX_DOB_ATTEMPTS - attempts };
  }

  const now = new Date();
  // Single conditional update: the token is consumed in the same write that
  // records the decision, so a second (or concurrent) use finds nothing
  const updated = await Connection.findOneAndUpdate(
    {
      _id: connection._id,
      'consent.tokenHash': hash,
      'consent.status': 'PENDING_CONSENT',
      'consent.tokenExpires': { $gt: now }
    },
    {
      $set: { 'consent.status': toStatus, 'consent.respondedAt': now, 'consent.textVersion': textVersion },
      $unset: { 'consent.tokenHash': 1, 'consent.tokenExpires': 1 }
    },
    { new: true }
  );
  if (!updated) return { ok: false, code: 'INVALID_TOKEN' };

  logConsentEvent(req, {
    subtype: decisionSubtype(toStatus),
    connection: updated,
    before: 'PENDING_CONSENT',
    after: toStatus,
    agent: patientAgent(updated),
    textVersion
  });
  await notifyProvider(updated, toStatus);

  // Offer claiming as the next step (the emailed claim link stays valid too)
  const rawClaim = await issueClaimToken(idOf(updated.patient));
  return { ok: true, status: toStatus, claimUrl: rawClaim ? claimUrl(rawClaim) : null };
};

/** A signed-in (claimed) patient answers a pending request from their account. */
const respondAsPatient = async (connectionId, patientId, { decision, textVersion }, req) => {
  const invalid = decisionError(decision, textVersion);
  if (invalid) return { ok: false, code: invalid };
  const toStatus = DECISIONS[decision];

  // Returns the pre-update document, so its status is the 'before' state
  const previous = await Connection.findOneAndUpdate(
    { _id: connectionId, patient: patientId, 'consent.status': { $in: AWAITING_STATUSES } },
    {
      $set: { 'consent.status': toStatus, 'consent.respondedAt': new Date(), 'consent.textVersion': textVersion },
      $unset: { 'consent.tokenHash': 1, 'consent.tokenExpires': 1 }
    }
  );
  if (!previous) return { ok: false, code: 'NOT_PENDING' };

  logConsentEvent(req, {
    subtype: decisionSubtype(toStatus),
    connection: previous,
    before: previous.consent.status,
    after: toStatus,
    textVersion
  });
  await notifyProvider(previous, toStatus);
  return { ok: true, status: toStatus };
};

/**
 * Patient withdraws a previously given consent. The Connection is kept (never
 * deleted) so the consent history survives; access is revoked by the status.
 */
const withdraw = async (connectionId, patientId, req) => {
  const updated = await Connection.findOneAndUpdate(
    { _id: connectionId, patient: patientId, 'consent.status': 'ACTIVE' },
    {
      $set: {
        'consent.status': 'WITHDRAWN',
        'consent.withdrawnAt': new Date(),
        accessLevel: 'limited',
        fullAccessStatus: 'none',
        fullAccessStatusUpdatedAt: new Date()
      }
    },
    { new: true }
  );
  if (!updated) return { ok: false, code: 'NOT_ACTIVE' };

  logConsentEvent(req, {
    subtype: 'consent-withdrawn',
    connection: updated,
    before: 'ACTIVE',
    after: 'WITHDRAWN',
    textVersion: updated.consent.textVersion
  });
  await notifyProvider(updated, 'WITHDRAWN');
  return { ok: true, status: 'WITHDRAWN' };
};

/**
 * Provider records that the patient could not consent at the point of care.
 * Instrumentation only — it never changes the consent state.
 */
const recordDeferral = async (connection, { reason, note }, req) => {
  if (!DEFERRAL_REASONS.includes(reason)) return { ok: false, code: 'INVALID_REASON' };
  const trimmedNote = typeof note === 'string' ? note.trim() : '';
  if (reason === 'other' && !trimmedNote) return { ok: false, code: 'NOTE_REQUIRED' };
  if (!AWAITING_STATUSES.includes(connection.consent.status)) {
    return { ok: false, code: 'NOT_PENDING' };
  }

  await Connection.updateOne(
    { _id: connection._id },
    {
      $push: {
        'consent.deferrals': {
          reason,
          note: trimmedNote || undefined,
          recordedBy: req.user._id || req.user.id,
          at: new Date()
        }
      }
    }
  );
  // The reason code is safe to audit; the free-text note is not (may hold PHI)
  logConsentEvent(req, {
    subtype: 'consent-deferred',
    connection,
    before: connection.consent.status,
    after: connection.consent.status,
    outcomeDesc: reason
  });
  return { ok: true };
};

module.exports = {
  CONSENT_TOKEN_TTL_MS,
  CLAIM_TOKEN_TTL_MS,
  MAX_DOB_ATTEMPTS,
  DEFERRAL_REASONS,
  AWAITING_STATUSES,
  hashToken,
  toDateKey,
  sameDob,
  providerDisplayName,
  sendConsentInvite,
  issueClaimToken,
  findPatientByClaimToken,
  lookupConsentToken,
  getConsentRequest,
  expireStale,
  respondWithToken,
  respondAsPatient,
  withdraw,
  recordDeferral,
  logConsentEvent
};
