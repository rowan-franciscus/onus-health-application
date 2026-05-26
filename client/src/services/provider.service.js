import ApiService from './api.service';

const ProviderService = {
  // Practice
  getPractice: () => ApiService.get('/provider/practice'),
  createPractice: (name) => ApiService.post('/provider/practice', { name }),

  // Team
  inviteAdmin: (payload) => ApiService.post('/provider/practice/admins/invite', payload),
  revokeAdmin: (adminId) => ApiService.post(`/provider/practice/admins/${adminId}/revoke`),

  // Billing
  getBilling: () => ApiService.get('/provider/billing'),
  updateBillingStatus: (consultationId, billingStatus) =>
    ApiService.patch(`/provider/billing/${consultationId}/status`, { billingStatus }),
  exportBillingCsvUrl: '/provider/billing/export/csv'
};

export default ProviderService;
