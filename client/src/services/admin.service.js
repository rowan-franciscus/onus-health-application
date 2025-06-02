import ApiService from './api.service';
import config from '../config';

/**
 * Get dashboard analytics with optional date range
 */
const getDashboardAnalytics = async (startDate, endDate) => {
  console.log('Fetching dashboard analytics with token:', localStorage.getItem(config.tokenKey) ? 'Token exists' : 'No token');
  
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  try {
    return await ApiService.get('/admin/analytics/dashboard', params);
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    throw error;
  }
};

/**
 * Get detailed analytics with optional filters
 */
const getAnalytics = async (startDate, endDate, metric) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (metric) params.metric = metric;

  return await ApiService.get('/admin/analytics', params);
};

/**
 * Get all users with optional filters
 */
const getUsers = async (filters = {}) => {
  return await ApiService.get('/admin/users', filters);
};

/**
 * Get user by ID
 */
const getUserById = async (userId) => {
  console.log('Getting user by ID:', userId);
  try {
    const response = await ApiService.get(`/admin/users/${userId}`);
    console.log('User data received:', response);
    return response;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
};

/**
 * Update user
 */
const updateUser = async (userId, userData) => {
  return await ApiService.put(`/admin/users/${userId}`, userData);
};

/**
 * Delete user
 */
const deleteUser = async (userId) => {
  await ApiService.delete(`/admin/users/${userId}`);
  return true;
};

/**
 * Get provider verification requests
 */
const getProviderVerifications = async (filters = {}) => {
  return await ApiService.get('/admin/provider-verifications', filters);
};

/**
 * Process provider verification
 */
const processProviderVerification = async (userId, action, notes) => {
  console.log(`Processing provider verification - userId: ${userId}, action: ${action}, notes: ${notes}`);
  try {
    const response = await ApiService.post(`/admin/provider-verification/${userId}`, { 
      action, 
      rejectionReason: notes
    });
    console.log('Provider verification processed:', response);
    return response;
  } catch (error) {
    console.error('Error processing provider verification:', error);
    throw error;
  }
};

/**
 * Update admin profile
 */
const updateProfile = async (profileData) => {
  return await ApiService.put('/admin/profile', profileData);
};

/**
 * Change admin password
 */
const changePassword = async (currentPassword, newPassword) => {
  return await ApiService.put('/admin/change-password', { currentPassword, newPassword });
};

/**
 * Get all patients with optional filters
 */
const getPatients = async (filters = {}) => {
  const params = { ...filters, role: 'patient' };
  return await ApiService.get('/admin/users', params);
};

/**
 * Get patient statistics
 */
const getPatientStatistics = async () => {
  return await ApiService.get('/admin/statistics/patients');
};

/**
 * Get patient activity
 */
const getPatientActivity = async (patientId) => {
  return await ApiService.get(`/admin/patients/${patientId}/activity`);
};

/**
 * Get patient consultations
 */
const getPatientConsultations = async (patientId) => {
  return await ApiService.get(`/admin/patients/${patientId}/consultations`);
};

/**
 * Get patient medical records
 */
const getPatientMedicalRecords = async (patientId, recordType = null) => {
  const params = {};
  if (recordType) params.type = recordType;
  
  return await ApiService.get(`/admin/patients/${patientId}/medical-records`, params);
};

/**
 * Get provider verification requests
 */
const getProviderVerificationRequests = async () => {
  return await ApiService.get('/admin/provider-verifications', { status: 'pending' });
};

const adminService = {
  getDashboardAnalytics,
  getAnalytics,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getProviderVerifications,
  processProviderVerification,
  updateProfile,
  changePassword,
  // Patient specific methods
  getPatients,
  getPatientStatistics,
  getPatientActivity,
  getPatientConsultations,
  getPatientMedicalRecords,
  // Provider verification methods
  getProviderVerificationRequests
};

export default adminService; 