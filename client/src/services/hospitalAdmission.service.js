import ApiService from './api.service';

const HospitalAdmissionService = {
  listAdmissions: (params = {}) =>
    ApiService.get('/hospital-admissions', params),

  listPatientAdmissions: (patientId) =>
    ApiService.get(`/hospital-admissions/patient/${patientId}`),

  getAdmission: (admissionId) =>
    ApiService.get(`/hospital-admissions/${admissionId}`),

  createAdmission: (payload) =>
    ApiService.post('/hospital-admissions', payload),

  addObservation: (admissionId, payload) =>
    ApiService.post(`/hospital-admissions/${admissionId}/observations`, payload),

  dischargePatient: (admissionId) =>
    ApiService.patch(`/hospital-admissions/${admissionId}/discharge`, {}),

  reAdmitPatient: (admissionId) =>
    ApiService.patch(`/hospital-admissions/${admissionId}/readmit`, {}),
};

export default HospitalAdmissionService;
