/**
 * Versioned consent text shown on the public consent page.
 *
 * A released version is IMMUTABLE: audit events reference its ID, so editing
 * the wording in place would misrepresent what a patient agreed to. To change
 * the text, add a new key and point CURRENT_VERSION at it.
 *
 * Wording is a draft pending legal review.
 */

const versions = {
  '2026-10-v1': {
    title: 'Consent to have your health record held and used by your provider',
    consentTo: [
      'Your provider may create and keep a health record for you on Onus Health.',
      'Your provider may add consultation notes, vitals, medications, test results, documents and other clinical information to that record.',
      'Staff in your provider\'s practice may see your name, contact details and medical aid details for administration and billing. They cannot see clinical information.'
    ],
    dataHeld: [
      'Identity and contact details: name, email address, mobile number, date of birth',
      'Medical aid / insurance details',
      'Clinical information your provider records: consultations, vitals, medications, immunisations, lab and radiology results, hospital and surgery records, and uploaded documents'
    ],
    withdrawal: 'You can withdraw this consent at any time by claiming your profile and choosing "Withdraw consent" on the Connections page of your account. Once withdrawn, your provider can no longer view or add to your record.',
    declineNote: 'If you decline, your provider will not be able to add anything to your record and will be told that you declined.'
  }
};

const CURRENT_VERSION = '2026-10-v1';

const getConsentText = (version = CURRENT_VERSION) => {
  const text = versions[version];
  return text ? { version, ...text } : null;
};

module.exports = {
  CURRENT_VERSION,
  versions,
  getConsentText
};
