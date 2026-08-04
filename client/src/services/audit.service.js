import ApiService from './api.service';

/**
 * Query the audit trail (admin only).
 * Filters: patientId, actorId, startDate, endDate, type, subtype, action, page, limit.
 */
const getAuditLogs = async (filters = {}) => {
  const params = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params[key] = value;
    }
  });
  return await ApiService.get('/admin/audit-logs', params);
};

const auditService = {
  getAuditLogs
};

export default auditService;
