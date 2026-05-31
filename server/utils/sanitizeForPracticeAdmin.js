/**
 * Whitelist-based sanitizer for any data leaving the API to a practice_admin user.
 * Practice Admins must never see clinical data: notes, vitals, findings, history,
 * physicalExamination, management, medications, immunizations, labResults,
 * radiologyReports, hospitalRecords, surgeryRecords, attachments.
 */

function sanitizeConsultationForPracticeAdmin(consultation) {
  if (!consultation) return null;
  const c = typeof consultation.toObject === 'function' ? consultation.toObject() : consultation;

  return {
    _id: c._id,
    date: c.date,
    billingStatus: c.billingStatus || 'pending',
    caseStatus: c.caseStatus,
    status: c.status,
    patient: c.patient && typeof c.patient === 'object'
      ? {
          _id: c.patient._id,
          firstName: c.patient.firstName,
          lastName: c.patient.lastName
        }
      : c.patient,
    provider: c.provider && typeof c.provider === 'object'
      ? {
          _id: c.provider._id,
          firstName: c.provider.firstName,
          lastName: c.provider.lastName
        }
      : c.provider,
    general: {
      diagnosis: c.general && c.general.diagnosis ? c.general.diagnosis : null
    }
  };
}

function sanitizePatientForPracticeAdmin(user) {
  if (!user) return null;
  const u = typeof user.toObject === 'function' ? user.toObject() : user;

  return {
    _id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email || null,
    phone: u.phone || null,
    profileImage: u.profileImage || null,
    patientProfile: {
      dateOfBirth: u.patientProfile ? u.patientProfile.dateOfBirth : null,
      gender: u.patientProfile ? u.patientProfile.gender : null,
      address: u.patientProfile ? u.patientProfile.address : null,
      insurance: u.patientProfile ? u.patientProfile.insurance : null
    }
  };
}

module.exports = {
  sanitizeConsultationForPracticeAdmin,
  sanitizePatientForPracticeAdmin
};
