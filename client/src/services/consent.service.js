import axios from 'axios';
import config from '../config';
import ApiService from './api.service';

/**
 * Patient consent for provider-initiated onboarding.
 * Public link calls use plain axios: the patient has no session.
 */
const ConsentService = {
  // ---- Public consent link ----
  getConsentRequest: async (token) => {
    const res = await axios.get(`${config.apiUrl}/consent/${token}`);
    return res.data;
  },

  respond: async (token, { dateOfBirth, decision, textVersion }) => {
    const res = await axios.post(`${config.apiUrl}/consent/${token}/respond`, { dateOfBirth, decision, textVersion });
    return res.data;
  },

  // ---- Public claim link ----
  getClaim: async (token) => {
    const res = await axios.get(`${config.apiUrl}/auth/claim/${token}`);
    return res.data;
  },

  claim: async (token, { password, dateOfBirth, firstName, lastName }) => {
    const res = await axios.post(`${config.apiUrl}/auth/claim/${token}`, { password, dateOfBirth, firstName, lastName });
    return res.data;
  },

  // ---- Provider ----
  resend: (patientId) => ApiService.post(`/provider/patients/${patientId}/consent/resend`),

  recordDeferral: (patientId, { reason, note }) =>
    ApiService.post(`/provider/patients/${patientId}/consent/deferral`, { reason, note }),

  // ---- Signed-in patient ----
  getMyConsents: () => ApiService.get('/connections/patient/consents'),

  respondAsPatient: (connectionId, { decision, textVersion }) =>
    ApiService.post(`/connections/patient/consent/${connectionId}/respond`, { decision, textVersion }),

  withdraw: (connectionId) => ApiService.post(`/connections/patient/consent/${connectionId}/withdraw`),

  // ---- Admin ----
  getReport: (params = {}) => ApiService.get('/admin/reports/consent', params)
};

export const DEFERRAL_REASONS = [
  { value: 'no_phone', label: 'No phone on them' },
  { value: 'no_email_access', label: 'No email access' },
  { value: 'no_email_address', label: 'No email address' },
  { value: 'declined_verbally', label: 'Declined verbally' },
  { value: 'other', label: 'Other' }
];

export const CONSENT_STATUS = {
  PENDING_CONSENT: { label: 'Pending consent', variant: 'warning' },
  ACTIVE: { label: 'Consented', variant: 'success' },
  DECLINED: { label: 'Declined', variant: 'error' },
  EXPIRED: { label: 'Link expired', variant: 'default' },
  WITHDRAWN: { label: 'Withdrawn', variant: 'error' }
};

/** Matches the server: only ACTIVE consent lets a provider act on a patient. */
export const isConsentActive = (status) => status === 'ACTIVE';

/** The patient hasn't answered yet: a consent link can be (re)sent. */
export const isAwaitingConsent = (status) => status === 'PENDING_CONSENT' || status === 'EXPIRED';

/** Message from an axios/ApiService error response, with a fallback. */
export const errorMessage = (error, fallback = 'Something went wrong. Please try again.') =>
  error?.response?.data?.message || fallback;

const CONSENT_REQUIRED_MESSAGES = {
  PENDING_CONSENT: 'This patient hasn\'t given consent yet. Open their profile to resend the consent link.',
  EXPIRED: 'This patient\'s consent link expired before they responded. Open their profile to send a new link.',
  DECLINED: 'The patient declined consent, so you can\'t add to this record.',
  WITHDRAWN: 'The patient withdrew consent, so you can\'t add to this record.'
};

const NO_CONSENT_STATUS_MESSAGE =
  'Consent isn\'t active for this patient. Open their profile to check their consent status.';

/**
 * Provider-facing message for a 403 CONSENT_REQUIRED response, with the next
 * step for the patient's consent state; null for any other error.
 */
export const consentRequiredMessage = (error) => {
  const data = error?.response?.data;
  if (data?.code !== 'CONSENT_REQUIRED') return null;
  if (CONSENT_REQUIRED_MESSAGES[data.consentStatus]) return CONSENT_REQUIRED_MESSAGES[data.consentStatus];
  // consentStatus null: a connection with no consent state. Absent: no
  // connection at all, where the server's message says what to do.
  if (data.consentStatus === undefined && data.message) return data.message;
  return NO_CONSENT_STATUS_MESSAGE;
};

export default ConsentService;
