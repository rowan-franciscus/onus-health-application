/**
 * Remove ownership/identity fields from a client-supplied payload before it is
 * spread or assigned onto a clinical document.
 *
 * Consent is checked against the patient a request is authorized for; if the
 * payload could also set `patient` (or move a record to another provider or
 * consultation), a caller could write clinical data for a patient who never
 * consented. Server code sets these fields itself.
 *
 * `attachments` is server-managed too: it is only written by the upload
 * endpoints, and each entry's stored path is what the delete endpoint unlinks.
 */

const IDENTITY_FIELDS = ['_id', 'patient', 'provider', 'consultation', 'parentConsultation', 'recordType', 'attachments'];

const stripIdentityFields = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }
  const copy = { ...payload };
  IDENTITY_FIELDS.forEach((field) => {
    delete copy[field];
  });
  return copy;
};

module.exports = stripIdentityFields;
