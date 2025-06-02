import api from './api.service';

/**
 * Medical records service to handle all record type API calls
 */
class MedicalRecordsService {
  /**
   * Get medical records by type
   * @param {string} type - The type of medical record (vitals, medications, etc.)
   * @param {Object} params - Query parameters like search, startDate, endDate, etc.
   * @returns {Promise} Promise with the response data
   */
  async getRecordsByType(type, params = {}) {
    try {
      console.log(`Fetching ${type} records`);
      const response = await api.get(`/medical-records/${type}`, { params });
      
      // Ensure the response has the expected structure with default values
      // to prevent "Cannot read properties of undefined (reading 'records')" error
      return {
        records: (response?.data?.records || []),
        pagination: (response?.data?.pagination || {})
      };
    } catch (error) {
      console.error(`Error fetching ${type} records:`, error);
      // Return empty records array to prevent undefined errors
      return {
        records: [],
        pagination: {}
      };
    }
  }

  /**
   * Get a specific medical record by ID
   * @param {string} type - The type of medical record
   * @param {string} id - The record ID
   * @returns {Promise} Promise with the response data
   */
  async getRecordById(type, id) {
    try {
      const response = await api.get(`/medical-records/${type}/${id}`);
      
      // Ensure the response has the expected structure
      return {
        record: (response?.data?.record || null)
      };
    } catch (error) {
      console.error(`Error fetching ${type} record:`, error);
      // Return null record to prevent undefined errors
      return {
        record: null
      };
    }
  }

  /**
   * Get all vitals records
   * @param {Object} params - Query parameters
   * @returns {Promise} Promise with the response data
   */
  async getVitalsRecords(params = {}) {
    return this.getRecordsByType('vitals', params);
  }

  /**
   * Get all medications records
   * @param {Object} params - Query parameters
   * @returns {Promise} Promise with the response data
   */
  async getMedicationsRecords(params = {}) {
    return this.getRecordsByType('medications', params);
  }

  /**
   * Get all immunizations records
   * @param {Object} params - Query parameters
   * @returns {Promise} Promise with the response data
   */
  async getImmunizationsRecords(params = {}) {
    return this.getRecordsByType('immunizations', params);
  }

  /**
   * Get all lab results records
   * @param {Object} params - Query parameters
   * @returns {Promise} Promise with the response data
   */
  async getLabResultsRecords(params = {}) {
    return this.getRecordsByType('lab-results', params);
  }

  /**
   * Get all radiology reports records
   * @param {Object} params - Query parameters
   * @returns {Promise} Promise with the response data
   */
  async getRadiologyReportsRecords(params = {}) {
    return this.getRecordsByType('radiology-reports', params);
  }

  /**
   * Get all hospital records
   * @param {Object} params - Query parameters
   * @returns {Promise} Promise with the response data
   */
  async getHospitalRecords(params = {}) {
    return this.getRecordsByType('hospital-records', params);
  }

  /**
   * Get all surgery records
   * @param {Object} params - Query parameters
   * @returns {Promise} Promise with the response data
   */
  async getSurgeryRecords(params = {}) {
    return this.getRecordsByType('surgery-records', params);
  }
}

export default new MedicalRecordsService(); 