import ApiService from './api.service';

/**
 * Service for handling consultations
 */
const ConsultationService = {
  /**
   * Get all consultations for the current patient
   * @param {Object} params - Query parameters for pagination, sorting, etc.
   * @returns {Promise} - A promise that resolves to the consultations data
   */
  getPatientConsultations: async (params = {}) => {
    try {
      const response = await ApiService.get('/consultations/patient', { params });
      return response;
    } catch (error) {
      console.error('Error fetching patient consultations:', error);
      throw error;
    }
  },

  /**
   * Get a specific consultation by ID
   * @param {string} id - Consultation ID
   * @returns {Promise} - A promise that resolves to the consultation data
   */
  getConsultationById: async (id) => {
    try {
      const response = await ApiService.get(`/consultations/${id}`);
      return response;
    } catch (error) {
      console.error('Error fetching consultation details:', error);
      throw error;
    }
  },

  /**
   * Get recent consultations for dashboard
   * @param {number} limit - Maximum number of consultations to return
   * @returns {Promise} - A promise that resolves to the consultations data
   */
  getRecentConsultations: async (limit = 3) => {
    try {
      const response = await ApiService.get('/consultations/patient/recent', { 
        params: { limit } 
      });
      return response;
    } catch (error) {
      console.error('Error fetching recent consultations:', error);
      throw error;
    }
  },

  /**
   * Get consultation statistics 
   * @returns {Promise} - A promise that resolves to the consultation statistics
   */
  getConsultationStatistics: async () => {
    try {
      const response = await ApiService.get('/consultations/patient/statistics');
      return response;
    } catch (error) {
      console.error('Error fetching consultation statistics:', error);
      throw error;
    }
  },

  /**
   * Create a new consultation
   * @param {Object} consultationData - Consultation data including patient or patientEmail
   * @returns {Promise} - A promise that resolves to the created consultation
   */
  createConsultation: async (consultationData) => {
    try {
      const response = await ApiService.post('/consultations', consultationData);
      return response;
    } catch (error) {
      console.error('Error creating consultation:', error);
      throw error;
    }
  },

  /**
   * Update an existing consultation
   * @param {string} id - Consultation ID
   * @param {Object} updateData - Updated consultation data
   * @returns {Promise} - A promise that resolves to the updated consultation
   */
  updateConsultation: async (id, updateData) => {
    try {
      const response = await ApiService.put(`/consultations/${id}`, updateData);
      return response;
    } catch (error) {
      console.error('Error updating consultation:', error);
      throw error;
    }
  },

  /**
   * Add a follow-up consultation to an existing root consultation
   * @param {string} consultationId - Root consultation ID
   * @param {Object} payload - Follow-up consultation data
   * @returns {Promise} - A promise that resolves to the created follow-up
   */
  addFollowUp: async (consultationId, payload) => {
    try {
      const response = await ApiService.post(`/consultations/${consultationId}/follow-ups`, payload);
      return response;
    } catch (error) {
      console.error('Error adding follow-up:', error);
      throw error;
    }
  },

  /**
   * Close a consultation case
   * @param {string} consultationId - Root consultation ID
   * @returns {Promise} - A promise that resolves to the updated consultation
   */
  closeCase: async (consultationId) => {
    try {
      const response = await ApiService.post(`/consultations/${consultationId}/close`);
      return response;
    } catch (error) {
      console.error('Error closing case:', error);
      throw error;
    }
  },

  /**
   * Reopen a closed consultation case
   * @param {string} consultationId - Root consultation ID
   * @returns {Promise} - A promise that resolves to the updated consultation
   */
  reopenCase: async (consultationId) => {
    try {
      const response = await ApiService.post(`/consultations/${consultationId}/reopen`);
      return response;
    } catch (error) {
      console.error('Error reopening case:', error);
      throw error;
    }
  }
};

export default ConsultationService; 