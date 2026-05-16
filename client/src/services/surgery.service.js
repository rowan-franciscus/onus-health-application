import ApiService from './api.service';

const SurgeryService = {
  listSurgeries: (params = {}) =>
    ApiService.get('/surgeries', params),

  listPatientSurgeries: (patientId) =>
    ApiService.get(`/surgeries/patient/${patientId}`),

  getSurgery: (surgeryId) =>
    ApiService.get(`/surgeries/${surgeryId}`),

  createSurgery: (payload) =>
    ApiService.post('/surgeries', payload),

  addNote: (surgeryId, payload) =>
    ApiService.post(`/surgeries/${surgeryId}/notes`, payload),

  closeSurgery: (surgeryId) =>
    ApiService.patch(`/surgeries/${surgeryId}/close`, {}),

  reopenSurgery: (surgeryId) =>
    ApiService.patch(`/surgeries/${surgeryId}/reopen`, {}),
};

export default SurgeryService;
