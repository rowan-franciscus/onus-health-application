import ApiService from './api.service';

/**
 * Service for providers to manage patients
 */
const PatientService = {
  /**
   * Get all patients for the current provider
   * @param {Object} params - Query parameters
   * @returns {Promise} - A promise that resolves to the patients data
   */
  getProviderPatients: async (params = {}) => {
    const response = await ApiService.get('/provider/patients', params);
    return response;
  },

  /**
   * Get a specific patient by ID
   * @param {string} id - Patient ID
   * @returns {Promise} - A promise that resolves to the patient data
   */
  getPatientById: async (id) => {
    const response = await ApiService.get(`/provider/patients/${id}`);
    return response;
  },

  /**
   * Add a new patient by email
   * @param {Object} patientData - Patient data including email
   * @returns {Promise} - A promise that resolves to the created patient
   */
  addPatientByEmail: async (patientData) => {
    const response = await ApiService.post('/patients/add-by-email', patientData);
    return response;
  },

  /**
   * Search for patients by query
   * @param {string} query - Search query
   * @returns {Promise} - A promise that resolves to the search results
   */
  searchPatients: async (query) => {
    const response = await ApiService.get(`/patients/search?query=${encodeURIComponent(query)}`);
    return response;
  },

  /**
   * Get recently viewed patients
   * @param {number} limit - Number of patients to retrieve
   * @returns {Promise} - A promise that resolves to the recent patients
   */
  getRecentPatients: async (limit = 5) => {
    const response = await ApiService.get(`/patients/recent?limit=${limit}`);
    return response;
  },

  /**
   * Get patient access categories
   * @returns {Promise} - A promise that resolves to the patient categories
   */
  getPatientCategories: async () => {
    const response = await ApiService.get('/patients/categories');
    return response;
  },

  /**
   * Create a new consultation for a patient
   * @param {string} patientId - Patient ID
   * @param {Object} consultationData - Consultation data
   * @returns {Promise} - A promise that resolves to the created consultation
   */
  createConsultation: async (patientId, consultationData) => {
    const response = await ApiService.post(`/patients/${patientId}/consultations`, consultationData);
    return response;
  },
  
  /**
   * Request access to a patient's medical records
   * @param {string} patientId - Patient ID
   * @param {Object} requestData - Additional data for the access request
   * @returns {Promise} - A promise that resolves to the request response
   */
  requestAccess: async (patientId, requestData = {}) => {
    const response = await ApiService.post(`/patients/${patientId}/request-access`, requestData);
    return response;
  }
};

export default PatientService; 