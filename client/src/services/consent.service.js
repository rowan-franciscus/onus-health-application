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

/** No consent status means a link that predates consent (treated as active). */
export const isConsentActive = (status) => !status || status === 'ACTIVE';

/** The patient hasn't answered yet: a consent link can be (re)sent. */
export const isAwaitingConsent = (status) => status === 'PENDING_CONSENT' || status === 'EXPIRED';

/** Message from an axios/ApiService error response, with a fallback. */
export const errorMessage = (error, fallback = 'Something went wrong. Please try again.') =>
  error?.response?.data?.message || fallback;

export default ConsentService;
