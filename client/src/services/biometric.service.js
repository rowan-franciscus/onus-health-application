import ApiService from './api.service';

const BiometricService = {
  listPatientBiometrics: (patientId) =>
    ApiService.get(`/biometrics/${patientId}`),

  createBiometric: (patientId, payload) =>
    ApiService.post(`/biometrics/${patientId}`, payload),
};

export default BiometricService;
