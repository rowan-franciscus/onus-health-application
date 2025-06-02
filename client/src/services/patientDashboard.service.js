import ApiService from './api.service';
import MedicalRecordService from './medicalRecord.service';
import ConsultationService from './consultation.service';
import ConnectionService from './connection.service';

/**
 * Service for handling patient dashboard data
 */
const PatientDashboardService = {
  /**
   * Get patient dashboard data - consultations, vitals, and connection requests
   * @returns {Promise} - A promise that resolves to the dashboard data
   */
  getDashboardData: async () => {
    try {
      const response = await ApiService.get('/users/patient/dashboard');
      return response;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },

  /**
   * Get recent consultations for the patient
   * @param {number} limit - Number of consultations to retrieve
   * @returns {Promise} - A promise that resolves to the consultations data
   */
  getRecentConsultations: async (limit = 3) => {
    try {
      return await ConsultationService.getRecentConsultations(limit);
    } catch (error) {
      console.error('Error fetching recent consultations:', error);
      throw error;
    }
  },

  /**
   * Get recent vitals for the patient
   * @returns {Promise} - A promise that resolves to the vitals data
   */
  getRecentVitals: async () => {
    try {
      return await MedicalRecordService.getRecentRecords('vitals');
    } catch (error) {
      console.error('Error fetching recent vitals:', error);
      throw error;
    }
  },

  /**
   * Get pending provider connection requests
   * @returns {Promise} - A promise that resolves to the connection requests
   */
  getProviderRequests: async () => {
    try {
      return await ConnectionService.getConnections({ status: 'pending', role: 'patient' });
    } catch (error) {
      console.error('Error fetching provider requests:', error);
      throw error;
    }
  },

  /**
   * Respond to a provider connection request
   * @param {string} requestId - The request ID
   * @param {string} action - Either 'accept' or 'reject'
   * @returns {Promise} - A promise that resolves to the response
   */
  respondToProviderRequest: async (requestId, action) => {
    try {
      return await ConnectionService.updateConnection(requestId, { 
        status: action === 'accept' ? 'approved' : 'rejected' 
      });
    } catch (error) {
      console.error(`Error ${action}ing provider request:`, error);
      throw error;
    }
  }
};

export default PatientDashboardService; 