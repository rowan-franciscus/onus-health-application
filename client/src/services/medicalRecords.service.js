import api from './api.service';
import { formatDate } from '../utils/dateUtils';

/**
 * Medical records service to handle all record type API calls
 */
class MedicalRecordsService {
  /**
   * Get consultations and extract medical records by type
   * @param {string} type - The type of medical record (vitals, medications, etc.)
   * @param {Object} params - Query parameters
   * @returns {Promise} Promise with the response data
   */
  async getRecordsByType(type, params = {}) {
    try {
      console.log(`Fetching ${type} records for patient`);
      
      // For vitals, fetch directly from medical records API
      if (type === 'vitals') {
        const response = await api.get(`/medical-records/vitals`);
        return response;
      }
      
      // Fetch all completed consultations for the patient
      const response = await api.get('/consultations', {
        status: 'completed'
      });
      
      // Extract medical records from consultations
      const records = [];
      
      if (response && Array.isArray(response)) {
        response.forEach(consultation => {
          const consultationDate = consultation.date ? formatDate(consultation.date) : 'N/A';
          const provider = consultation.general?.specialistName || 
            (consultation.provider ? `${consultation.provider.firstName} ${consultation.provider.lastName}` : 'Unknown Provider');
          
          // Extract records based on type
          switch (type) {
            case 'medications':
              if (consultation.medications && consultation.medications.length > 0) {
                consultation.medications.forEach((medication, index) => {
                  records.push({
                    _id: `${consultation._id}-medication-${index}`,
                    consultationId: consultation._id,
                    date: consultation.date || consultation.createdAt,
                    provider: provider,
                    nameOfMedication: medication.name || 'N/A',
                    dosage: medication.dosage || {},
                    frequency: medication.frequency || 'N/A',
                    reasonForPrescription: medication.reasonForPrescription || 'N/A',
                    startDate: medication.startDate,
                    endDate: medication.endDate
                  });
                });
              }
              break;
              
            case 'immunizations':
              if (consultation.immunizations && consultation.immunizations.length > 0) {
                consultation.immunizations.forEach((immunization, index) => {
                  records.push({
                    _id: `${consultation._id}-immunization-${index}`,
                    consultationId: consultation._id,
                    date: consultation.date || consultation.createdAt,
                    provider: provider,
                    vaccineName: immunization.vaccineName || 'N/A',
                    dateAdministered: immunization.dateAdministered,
                    vaccineSerialNumber: immunization.vaccineSerialNumber || 'N/A',
                    nextDueDate: immunization.nextDueDate
                  });
                });
              }
              break;
              
            case 'lab-results':
              if (consultation.labResults && consultation.labResults.length > 0) {
                consultation.labResults.forEach((labResult, index) => {
                  records.push({
                    _id: `${consultation._id}-lab-${index}`,
                    consultationId: consultation._id,
                    date: consultation.date || consultation.createdAt,
                    provider: provider,
                    testName: labResult.testName || 'N/A',
                    labName: labResult.labName || 'N/A',
                    dateOfTest: labResult.dateOfTest,
                    results: labResult.results || 'N/A',
                    comments: labResult.comments || ''
                  });
                });
              }
              break;
              
            case 'radiology-reports':
              if (consultation.radiologyReports && consultation.radiologyReports.length > 0) {
                consultation.radiologyReports.forEach((report, index) => {
                  records.push({
                    _id: `${consultation._id}-radiology-${index}`,
                    consultationId: consultation._id,
                    date: consultation.date || consultation.createdAt,
                    provider: provider,
                    typeOfScan: report.typeOfScan || 'N/A',
                    dateOfScan: report.date,
                    bodyPartExamined: report.bodyPartExamined || 'N/A',
                    findings: report.findings || 'N/A',
                    recommendations: report.recommendations || ''
                  });
                });
              }
              break;
              
            case 'hospital-records':
              if (consultation.hospitalRecords && consultation.hospitalRecords.length > 0) {
                consultation.hospitalRecords.forEach((record, index) => {
                  records.push({
                    _id: `${consultation._id}-hospital-${index}`,
                    consultationId: consultation._id,
                    date: consultation.date || consultation.createdAt,
                    provider: provider,
                    admissionDate: record.admissionDate,
                    dischargeDate: record.dischargeDate,
                    reasonForHospitalisation: record.reasonForHospitalisation || 'N/A',
                    treatmentsReceived: record.treatmentsReceived || 'N/A',
                    attendingDoctors: record.attendingDoctors || 'N/A',
                    dischargeSummary: record.dischargeSummary || '',
                    investigationsDone: record.investigationsDone || ''
                  });
                });
              }
              break;
              
            case 'surgery-records':
              if (consultation.surgeryRecords && consultation.surgeryRecords.length > 0) {
                consultation.surgeryRecords.forEach((surgery, index) => {
                  records.push({
                    _id: `${consultation._id}-surgery-${index}`,
                    consultationId: consultation._id,
                    date: consultation.date || consultation.createdAt,
                    provider: provider,
                    typeOfSurgery: surgery.typeOfSurgery || 'N/A',
                    dateOfSurgery: surgery.date,
                    reason: surgery.reason || 'N/A',
                    complications: surgery.complications || 'None',
                    recoveryNotes: surgery.recoveryNotes || ''
                  });
                });
              }
              break;
          }
        });
      }
      
      // Sort records by date (newest first)
      records.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return {
        records: records,
        pagination: {
          total: records.length,
          page: 1,
          limit: records.length,
          pages: 1
        }
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
   * Get a single vitals record by ID
   * @param {string} id - The vitals record ID
   * @returns {Promise} Promise with the response data
   */
  async getVitalsRecordById(id) {
    try {
      const response = await api.get(`/medical-records/vitals/${id}`);
      return response;
    } catch (error) {
      console.error('Error fetching vitals record:', error);
      throw error;
    }
  }

  /**
   * Create patient vitals record
   * @param {Object} vitalsData - The vitals data to create
   * @returns {Promise} Promise with the response data
   */
  async createPatientVitals(vitalsData) {
    try {
      const response = await api.post('/medical-records/patient/vitals', vitalsData);
      return response;
    } catch (error) {
      console.error('Error creating patient vitals:', error);
      throw error;
    }
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