import ApiService from './api.service';

const PhysicalRecordService = {
  getPhysicalRecords: async (patientId) => {
    return ApiService.get(`/patients/${patientId}/physical-records`);
  },

  uploadPhysicalRecord: async (patientId, { file, description }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    return ApiService.post(`/patients/${patientId}/physical-records`, formData);
  },

  deletePhysicalRecord: async (patientId, recordId) => {
    return ApiService.delete(`/patients/${patientId}/physical-records/${recordId}`);
  }
};

export default PhysicalRecordService;
