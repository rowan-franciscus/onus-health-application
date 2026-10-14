/**
 * Connection Service — shared provider → existing-patient access request
 * (path 1). Used by POST /api/connections and by Add New Patient when the
 * entered email + DOB match an existing patient account.
 */

const Connection = require('../models/Connection');
const EmailQueue = require('../models/EmailQueue');
const config = require('../config/environment');

/**
 * Create a limited-access connection to a real patient account, optionally
 * requesting full access (which emails the patient). Caller must have checked
 * that no connection already exists.
 *
 * @param {Object} params
 * @param {Object} params.provider - Provider user (needs _id, firstName, lastName, providerProfile)
 * @param {Object} params.patient - Patient user (needs _id, email, firstName, lastName)
 * @param {String} [params.initiatedBy] - Acting user; defaults to the provider
 * @param {Boolean} [params.fullAccessRequested]
 * @param {String} [params.notes]
 * @returns {Promise<Object>} The saved Connection
 */
const createAccessRequest = async ({ provider, patient, initiatedBy, fullAccessRequested = false, notes }) => {
  const connection = new Connection({
    patient: patient._id,
    provider: provider._id,
    initiatedBy: initiatedBy || provider._id,
    accessLevel: 'limited', // Always start with limited access
    fullAccessStatus: fullAccessRequested ? 'pending' : 'none',
    notes,
    patientNotified: false,
    // Access request to an existing patient account (path 1): unchanged behaviour
    onboardingSource: 'patient_initiated',
    consent: { status: 'ACTIVE' }
  });

  await connection.save();

  // Queue email notification to patient if full access is requested
  if (fullAccessRequested) {
    await EmailQueue.create({
      to: patient.email,
      from: config.emailFrom || 'noreply@onushealth.com',
      subject: 'Healthcare Provider Connection Request',
      html: `<p>Dear ${patient.firstName},</p><p>Your healthcare provider ${provider.firstName} ${provider.lastName} has requested full access to your medical records on Onus Health.</p><p>Please log in to your account to approve or deny this request.</p>`,
      template: 'fullAccessRequest',
      templateData: {
        patientName: `${patient.firstName} ${patient.lastName}`,
        providerName: `${provider.firstName} ${provider.lastName}`,
        providerSpecialty: provider.providerProfile?.specialty || 'Healthcare Provider',
        notes: notes || 'No additional notes'
      },
      userId: patient._id
    });

    // Mark as notified
    connection.patientNotified = true;
    connection.patientNotifiedAt = Date.now();
    await connection.save();
  }

  return connection;
};

module.exports = {
  createAccessRequest
};
