/**
 * What a provider may see about a patient whose consent isn't ACTIVE: the
 * details that provider entered on Add New Patient (snapshotted on the
 * Connection), never anything the patient added later — e.g. an insurance
 * number entered after claiming their profile.
 *
 * Connections without a snapshot (access requests to existing accounts, or
 * links created before snapshots existed) expose identity only.
 */
const registrationDetails = (connection, patient) => {
  const r = connection && connection.registration;
  if (r && r.firstName) {
    return {
      _id: patient._id,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phone: r.phone,
      patientProfile: {
        dateOfBirth: r.dateOfBirth,
        gender: r.gender,
        insurance: r.insurance
      }
    };
  }
  return {
    _id: patient._id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    email: patient.email
  };
};

module.exports = registrationDetails;
