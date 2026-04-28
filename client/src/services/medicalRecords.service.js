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

      // For immunizations / hospital-records / surgery-records, fetch from the
      // authoritative endpoint (returns both consultation-attached AND standalone
      // records since they share one discriminator collection). Map server fields
      // into the shape the existing patient record pages expect.
      if (type === 'immunizations' || type === 'hospital-records' || type === 'surgery-records') {
        const response = await api.get(`/medical-records/${type}`, { limit: 100 });
        const rawRecords = (response && Array.isArray(response.records)) ? response.records : [];

        const providerLabel = (r) =>
          r.provider ? `${r.provider.firstName || ''} ${r.provider.lastName || ''}`.trim() || 'Unknown Provider' :
          (r.consultation?.general?.specialistName || 'Unknown Provider');

        const mapped = rawRecords.map(r => {
          const base = {
            _id: r._id,
            consultationId: r.consultation?._id || r.consultation || null,
            date: r.date || r.createdAt,
            provider: providerLabel(r)
          };

          if (type === 'immunizations') {
            return {
              ...base,
              vaccineName: r.vaccineName || 'N/A',
              dateAdministered: r.dateAdministered,
              vaccineSerialNumber: r.vaccineSerialNumber || 'N/A',
              nextDueDate: r.nextDueDate
            };
          }

          if (type === 'hospital-records') {
            const doctorsArr = Array.isArray(r.attendingDoctors)
              ? r.attendingDoctors.map(d => (d && d.name) ? d.name : d).filter(Boolean)
              : [];
            return {
              ...base,
              admissionDate: r.admissionDate,
              dischargeDate: r.dischargeDate,
              // Support both British and American spellings (schema uses ...ization)
              reasonForHospitalisation: r.reasonForHospitalization || r.reasonForHospitalisation || 'N/A',
              reasonForHospitalization: r.reasonForHospitalization || r.reasonForHospitalisation || 'N/A',
              treatmentsReceived: Array.isArray(r.treatmentsReceived) ? r.treatmentsReceived.join(', ') : (r.treatmentsReceived || 'N/A'),
              attendingDoctors: doctorsArr.join(', ') || 'N/A',
              dischargeSummary: r.dischargeSummary || '',
              investigationsDone: Array.isArray(r.investigationsDone) ? r.investigationsDone.join(', ') : (r.investigationsDone || '')
            };
          }

          // surgery-records
          return {
            ...base,
            typeOfSurgery: r.typeOfSurgery || 'N/A',
            dateOfSurgery: r.date,
            reason: r.reason || 'N/A',
            complications: r.complications || 'None',
            recoveryNotes: r.recoveryNotes || ''
          };
        });

        mapped.sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
          records: mapped,
          pagination: {
            total: mapped.length,
            page: 1,
            limit: mapped.length,
            pages: 1
          }
        };
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
              
            // 'immunizations', 'hospital-records', and 'surgery-records' are handled
            // by the early-return path above (authoritative endpoint) — no extraction here.

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
   * Create a standalone immunization record (not tied to a consultation).
   */
  async createImmunization(patientId, data) {
    return api.post('/medical-records/provider/immunizations', { patientId, ...data });
  }

  /**
   * Create a standalone hospital record (not tied to a consultation).
   */
  async createHospitalRecord(patientId, data) {
    return api.post('/medical-records/provider/hospital-records', { patientId, ...data });
  }

  /**
   * Create a standalone surgery record (not tied to a consultation).
   */
  async createSurgery(patientId, data) {
    return api.post('/medical-records/provider/surgery-records', { patientId, ...data });
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