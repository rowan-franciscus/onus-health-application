import ApiService from './api.service';

/**
 * Service for managing medical records
 */
const MedicalRecordService = {
  /**
   * Get all medical records for the current patient
   * @param {string} type - Type of medical record (vitals, medications, etc.)
   * @param {Object} params - Query parameters (pagination, sorting, etc.)
   * @returns {Promise} - A promise that resolves to the medical records
   */
  getPatientRecords: async (type, params = {}) => {
    try {
      const response = await ApiService.get(`/medical-records/patient/${type}`, { params });
      return response;
    } catch (error) {
      console.error(`Error fetching ${type} records:`, error);
      throw error;
    }
  },

  /**
   * Get a specific medical record by ID
   * @param {string} type - Type of medical record
   * @param {string} id - Medical record ID
   * @returns {Promise} - A promise that resolves to the medical record
   */
  getPatientRecordById: async (type, id) => {
    try {
      const response = await ApiService.get(`/medical-records/patient/${type}/${id}`);
      return response;
    } catch (error) {
      console.error(`Error fetching ${type} record:`, error);
      throw error;
    }
  },

  /**
   * Get recent medical records for dashboard
   * @param {string} type - Type of medical record 
   * @param {number} limit - Maximum number of records to retrieve
   * @returns {Promise} - A promise that resolves to the recent medical records
   */
  getRecentRecords: async (type, limit = 5) => {
    try {
      const response = await ApiService.get(`/medical-records/patient/${type}/recent`, { params: { limit } });
      return response;
    } catch (error) {
      console.error(`Error fetching recent ${type} records:`, error);
      throw error;
    }
  },

  /**
   * Get medical record statistics/summary
   * @param {string} type - Type of medical record
   * @returns {Promise} - A promise that resolves to the medical record statistics
   */
  getRecordStatistics: async (type) => {
    try {
      const response = await ApiService.get(`/medical-records/patient/${type}/statistics`);
      return response;
    } catch (error) {
      console.error(`Error fetching ${type} statistics:`, error);
      throw error;
    }
  },

  /**
   * Get all vitals records for the current patient
   * @param {Object} params - Query parameters
   * @returns {Promise} - A promise that resolves to the vitals records
   */
  getVitalsRecords: async (params = {}) => {
    return this.getPatientRecords('vitals', params);
  },

  /**
   * Get all medications records for the current patient
   * @param {Object} params - Query parameters
   * @returns {Promise} - A promise that resolves to the medications records
   */
  getMedicationsRecords: async (params = {}) => {
    return this.getPatientRecords('medications', params);
  },

  /**
   * Get all immunizations records for the current patient
   * @param {Object} params - Query parameters
   * @returns {Promise} - A promise that resolves to the immunizations records
   */
  getImmunizationsRecords: async (params = {}) => {
    return this.getPatientRecords('immunizations', params);
  },

  /**
   * Get all lab results records for the current patient
   * @param {Object} params - Query parameters
   * @returns {Promise} - A promise that resolves to the lab results records
   */
  getLabResultsRecords: async (params = {}) => {
    return this.getPatientRecords('lab-results', params);
  }
};

export default MedicalRecordService; 