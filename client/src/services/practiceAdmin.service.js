import ApiService from './api.service';

const PracticeAdminService = {
  getPractice: () => ApiService.get('/practice-admin/practice'),
  getPatients: () => ApiService.get('/practice-admin/patients'),
  registerPatient: (payload) => ApiService.post('/practice-admin/patients', payload),
  getPatient: (patientId) => ApiService.get(`/practice-admin/patients/${patientId}`),
  getOperationalOverview: (patientId) =>
    ApiService.get(`/practice-admin/patients/${patientId}/operational-overview`),
  getBilling: () => ApiService.get('/practice-admin/billing'),
  updateBillingStatus: (consultationId, billingStatus) =>
    ApiService.patch(`/practice-admin/billing/${consultationId}/status`, { billingStatus }),
  exportBillingDataUrl: '/practice-admin/billing/export/data',
  exportBillingCsvUrl: '/practice-admin/billing/export/csv'
};

export default PracticeAdminService;
