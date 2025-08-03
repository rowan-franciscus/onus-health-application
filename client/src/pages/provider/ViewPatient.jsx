import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import styles from './ViewPatient.module.css';

// Component imports
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Tabs from '../../components/common/Tabs';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PatientService from '../../services/patient.service';
import ApiService from '../../services/api.service';

const ProviderViewPatient = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState({
    vitals: [],
    medications: [],
    immunizations: [],
    labResults: [],
    radiology: [],
    hospital: [],
    surgery: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [accessRequestStatus, setAccessRequestStatus] = useState(null);
  const user = useSelector(state => state.auth.user);
  const verificationStatus = user?.isVerified;

  // Tabs for medical record types
  const recordTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'consultations', label: 'Consultations' },
    { id: 'vitals', label: 'Vitals' },
    { id: 'medications', label: 'Medications' },
    { id: 'immunizations', label: 'Immunizations' },
    { id: 'lab-results', label: 'Lab Results' },
    { id: 'radiology', label: 'Radiology' },
    { id: 'hospital', label: 'Hospital' },
    { id: 'surgery', label: 'Surgery' }
  ];

  useEffect(() => {
    fetchAllPatientData();
  }, [id]);

  // Fetch all patient data including consultations and medical records
  const fetchAllPatientData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch patient basic information
      const patientResponse = await PatientService.getPatientById(id);
      
      if (patientResponse && patientResponse.success && patientResponse.patient) {
        const patientData = patientResponse.patient;
        const connectionInfo = patientResponse.connectionInfo;
        
        // Calculate age helper function
        const calculateAge = (dateOfBirth) => {
          if (!dateOfBirth) return 'N/A';
          const today = new Date();
          const birthDate = new Date(dateOfBirth);
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          return age;
        };
        
        // Check if provider has full approved access
        const hasFullAccess = connectionInfo && 
                            connectionInfo.accessLevel === 'full' && 
                            connectionInfo.fullAccessStatus === 'approved';
        
        // Format patient data based on access level
        const formattedPatient = {
          id: patientData._id,
          name: `${patientData.firstName} ${patientData.lastName}`,
          email: patientData.email,
          // Access level based on connection info
          accessLevel: connectionInfo?.fullAccessStatus === 'pending' ? 'pending' : 
                       (hasFullAccess ? 'full' : 'limited'),
          // Profile data only available with full access
          gender: hasFullAccess ? (patientData.patientProfile?.gender || 'N/A') : 'Not available',
          dateOfBirth: hasFullAccess && patientData.patientProfile?.dateOfBirth ? 
            new Date(patientData.patientProfile.dateOfBirth).toLocaleDateString() : 'Not available',
          age: hasFullAccess ? calculateAge(patientData.patientProfile?.dateOfBirth) : 'Not available',
          phone: hasFullAccess ? (patientData.phone || 'N/A') : 'Not available',
          address: hasFullAccess && patientData.patientProfile?.address ? 
            `${patientData.patientProfile.address.street || ''}, ${patientData.patientProfile.address.city || ''}, ${patientData.patientProfile.address.state || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',') || 'N/A' : 'Not available',
          insurance: {
            provider: hasFullAccess ? (patientData.patientProfile?.insurance?.provider || 'N/A') : 'Not available',
            planType: hasFullAccess ? (patientData.patientProfile?.insurance?.plan || 'N/A') : 'Not available',
            memberId: hasFullAccess ? (patientData.patientProfile?.insurance?.insuranceNumber || 'N/A') : 'Not available'
          },
          emergencyContact: {
            name: hasFullAccess ? (patientData.patientProfile?.emergencyContact?.name || 'N/A') : 'Not available',
            relationship: hasFullAccess ? (patientData.patientProfile?.emergencyContact?.relationship || 'N/A') : 'Not available',
            phone: hasFullAccess ? (patientData.patientProfile?.emergencyContact?.phone || 'N/A') : 'Not available'
          },
          medicalHistory: {
            chronicConditions: hasFullAccess ? (patientData.patientProfile?.medicalHistory?.chronicConditions || []) : [],
            allergies: hasFullAccess ? (patientData.patientProfile?.allergies || []) : [],
            surgeries: hasFullAccess ? (patientData.patientProfile?.medicalHistory?.significantIllnesses || []) : [],
            familyHistory: hasFullAccess ? (patientData.patientProfile?.familyMedicalHistory || []) : []
          },
          lifestyle: {
            smoking: hasFullAccess ? (patientData.patientProfile?.lifestyle?.smoking || 'N/A') : 'Not available',
            alcohol: hasFullAccess ? (patientData.patientProfile?.lifestyle?.alcohol || 'N/A') : 'Not available',
            exercise: hasFullAccess ? (patientData.patientProfile?.lifestyle?.exercise || 'N/A') : 'Not available',
            dietaryPreferences: hasFullAccess ? (patientData.patientProfile?.lifestyle?.dietaryPreferences || 'N/A') : 'Not available'
          },
          currentMedications: hasFullAccess ? (patientData.patientProfile?.currentMedications || []) : [],
          supplements: hasFullAccess ? (patientData.patientProfile?.supplements || 'N/A') : 'Not available',
          immunisationHistory: hasFullAccess ? (patientData.patientProfile?.immunisationHistory || []) : []
        };
        
        setPatient(formattedPatient);
        
        // Set access request status if pending
        if (connectionInfo?.fullAccessStatus === 'pending') {
          setAccessRequestStatus('pending');
        } else {
          setAccessRequestStatus(null);
        }
        
        // Fetch consultations for this patient
        await fetchPatientConsultations(id);
      } else {
        console.log('No patient data received');
        setPatient(null);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching patient data:', error);
      toast.error('Failed to load patient information');
      setPatient(null);
      setIsLoading(false);
    }
  };

  // Fetch consultations for the patient
  const fetchPatientConsultations = async (patientId) => {
    try {
      const response = await ApiService.get('/consultations', {
        patient: patientId
      });
      
      if (response && Array.isArray(response)) {
        const formattedConsultations = response.map(consultation => ({
          id: consultation._id,
          date: consultation.date ? new Date(consultation.date).toLocaleDateString() : 'N/A',
          provider: consultation.general?.specialistName || 'Unknown Provider',
          specialty: consultation.general?.specialty || 'General',
          reason: consultation.general?.reasonForVisit || 'N/A',
          notes: consultation.general?.notes || 'No notes',
          status: consultation.status || 'draft',
          practice: consultation.general?.practice || 'N/A'
        }));
        
        setConsultations(formattedConsultations);
        
        // Extract medical records from consultations
        extractMedicalRecords(response);
        
        // Also fetch vitals directly from medical records API to include patient-created vitals
        await fetchVitalsRecords(patientId);
      } else {
        setConsultations([]);
        setMedicalRecords({
          vitals: [],
          medications: [],
          immunizations: [],
          labResults: [],
          radiology: [],
          hospital: [],
          surgery: []
        });
      }
    } catch (error) {
      console.error('Error fetching consultations:', error);
      setConsultations([]);
    }
  };

  // Fetch vitals records directly from API (includes patient-created vitals)
  const fetchVitalsRecords = async (patientId) => {
    try {
      const response = await ApiService.get('/medical-records/provider/vitals', {
        patientId: patientId,
        limit: 100
      });
      
      if (response && response.records) {
        const formattedVitals = response.records.map(record => ({
          id: record._id,
          date: record.date ? new Date(record.date).toLocaleDateString() : 'N/A',
          provider: record.createdByPatient ? 'Patient (Self)' : (record.provider?.firstName + ' ' + record.provider?.lastName || 'Unknown Provider'),
          heartRate: formatVitalValue(record.heartRate),
          bloodPressure: record.bloodPressure ? 
            `${record.bloodPressure.systolic || 'N/A'}/${record.bloodPressure.diastolic || 'N/A'}` : 'N/A',
          bodyTemperature: formatVitalValue(record.bodyTemperature),
          respiratoryRate: formatVitalValue(record.respiratoryRate),
          bloodOxygenSaturation: formatVitalValue(record.bloodOxygenSaturation),
          weight: formatVitalValue(record.weight),
          height: formatVitalValue(record.height),
          bmi: formatVitalValue(record.bmi),
          bloodGlucose: formatVitalValue(record.bloodGlucose),
          bodyFatPercentage: formatVitalValue(record.bodyFatPercentage),
          createdByPatient: record.createdByPatient || false
        }));
        
        setMedicalRecords(prev => ({
          ...prev,
          vitals: formattedVitals
        }));
      }
    } catch (error) {
      console.error('Error fetching vitals records:', error);
    }
  };

  // Helper function to format vital values
  const formatVitalValue = (vital) => {
    if (!vital) return 'N/A';
    if (typeof vital === 'object' && vital.value !== undefined) {
      return vital.unit ? `${vital.value} ${vital.unit}` : vital.value;
    }
    return vital;
  };

  // Extract medical records from consultations
  const extractMedicalRecords = (consultations) => {
    const records = {
      vitals: [],
      medications: [],
      immunizations: [],
      labResults: [],
      radiology: [],
      hospital: [],
      surgery: []
    };

    consultations.forEach(consultation => {
      const consultationDate = consultation.date ? new Date(consultation.date).toLocaleDateString() : 'N/A';
      const provider = consultation.general?.specialistName || 'Unknown Provider';

      // Extract vitals
      if (consultation.vitals) {
        const vitals = consultation.vitals;
        
        // Helper function to format vital values
        const formatVitalValue = (vital) => {
          if (!vital) return 'N/A';
          if (typeof vital === 'object' && vital.value !== undefined) {
            return vital.unit ? `${vital.value} ${vital.unit}` : vital.value;
          }
          return vital;
        };

        const vitalRecord = {
          id: `${consultation._id}-vitals`,
          date: consultationDate,
          provider: provider,
          heartRate: formatVitalValue(vitals.heartRate),
          bloodPressure: vitals.bloodPressure ? 
            `${vitals.bloodPressure.systolic || 'N/A'}/${vitals.bloodPressure.diastolic || 'N/A'}` : 'N/A',
          bodyTemperature: formatVitalValue(vitals.bodyTemperature),
          respiratoryRate: formatVitalValue(vitals.respiratoryRate),
          bloodOxygenSaturation: formatVitalValue(vitals.bloodOxygenSaturation),
          weight: formatVitalValue(vitals.weight),
          height: formatVitalValue(vitals.height),
          bmi: formatVitalValue(vitals.bmi),
          bloodGlucose: formatVitalValue(vitals.bloodGlucose),
          bodyFatPercentage: formatVitalValue(vitals.bodyFatPercentage)
        };
        records.vitals.push(vitalRecord);
      }

      // Extract medications
      if (consultation.medications && consultation.medications.length > 0) {
        consultation.medications.forEach(medication => {
          // Helper function to format field values that might be objects
          const formatFieldValue = (field) => {
            if (!field) return 'N/A';
            if (typeof field === 'object' && field.value !== undefined) {
              return field.unit ? `${field.value} ${field.unit}` : field.value;
            }
            return field;
          };

          records.medications.push({
            id: medication._id || `${consultation._id}-med-${Math.random()}`,
            date: consultationDate,
            provider: provider,
            name: formatFieldValue(medication.nameOfMedication) || 'Unknown Medication',
            dosage: formatFieldValue(medication.dosage),
            frequency: formatFieldValue(medication.frequency),
            reason: formatFieldValue(medication.reasonForPrescription),
            startDate: medication.startDate ? new Date(medication.startDate).toLocaleDateString() : 'N/A',
            endDate: medication.endDate ? new Date(medication.endDate).toLocaleDateString() : 'N/A'
          });
        });
      }

      // Extract immunizations
      if (consultation.immunizations && consultation.immunizations.length > 0) {
        consultation.immunizations.forEach(immunization => {
          // Helper function to format field values that might be objects
          const formatFieldValue = (field) => {
            if (!field) return 'N/A';
            if (typeof field === 'object' && field.value !== undefined) {
              return field.unit ? `${field.value} ${field.unit}` : field.value;
            }
            return field;
          };

          records.immunizations.push({
            id: immunization._id || `${consultation._id}-imm-${Math.random()}`,
            date: consultationDate,
            provider: provider,
            vaccineName: formatFieldValue(immunization.vaccineName) || 'Unknown Vaccine',
            dateAdministered: immunization.dateAdministered ? 
              new Date(immunization.dateAdministered).toLocaleDateString() : 'N/A',
            serialNumber: formatFieldValue(immunization.vaccineSerialNumber),
            nextDueDate: immunization.nextDueDate ? 
              new Date(immunization.nextDueDate).toLocaleDateString() : 'N/A'
          });
        });
      }

      // Extract lab results
      if (consultation.labResults && consultation.labResults.length > 0) {
        consultation.labResults.forEach(lab => {
          // Helper function to format field values that might be objects
          const formatFieldValue = (field) => {
            if (!field) return 'N/A';
            if (typeof field === 'object' && field.value !== undefined) {
              return field.unit ? `${field.value} ${field.unit}` : field.value;
            }
            return field;
          };

          records.labResults.push({
            id: lab._id || `${consultation._id}-lab-${Math.random()}`,
            date: consultationDate,
            provider: provider,
            testName: formatFieldValue(lab.testName) || 'Unknown Test',
            labName: formatFieldValue(lab.labName),
            testDate: lab.dateOfTest ? new Date(lab.dateOfTest).toLocaleDateString() : 'N/A',
            results: formatFieldValue(lab.results),
            comments: formatFieldValue(lab.comments)
          });
        });
      }

      // Extract radiology reports
      if (consultation.radiologyReports && consultation.radiologyReports.length > 0) {
        consultation.radiologyReports.forEach(radiology => {
          // Helper function to format field values that might be objects
          const formatFieldValue = (field) => {
            if (!field) return 'N/A';
            if (typeof field === 'object' && field.value !== undefined) {
              return field.unit ? `${field.value} ${field.unit}` : field.value;
            }
            return field;
          };

          records.radiology.push({
            id: radiology._id || `${consultation._id}-rad-${Math.random()}`,
            date: consultationDate,
            provider: provider,
            scanType: formatFieldValue(radiology.typeOfScan) || 'Unknown Scan',
            scanDate: radiology.date ? new Date(radiology.date).toLocaleDateString() : 'N/A',
            bodyPart: formatFieldValue(radiology.bodyPartExamined),
            findings: formatFieldValue(radiology.findings),
            recommendations: formatFieldValue(radiology.recommendations)
          });
        });
      }

      // Extract hospital records
      if (consultation.hospitalRecords && consultation.hospitalRecords.length > 0) {
        consultation.hospitalRecords.forEach(hospital => {
          // Helper function to format field values that might be objects
          const formatFieldValue = (field) => {
            if (!field) return 'N/A';
            if (typeof field === 'object' && field.value !== undefined) {
              return field.unit ? `${field.value} ${field.unit}` : field.value;
            }
            return field;
          };

          // Helper function to format arrays
          const formatArrayValue = (arr) => {
            if (!arr || !Array.isArray(arr)) return 'N/A';
            return arr.map(item => {
              if (typeof item === 'object' && item.name) return item.name;
              return formatFieldValue(item);
            }).join(', ');
          };

          records.hospital.push({
            id: hospital._id || `${consultation._id}-hosp-${Math.random()}`,
            date: consultationDate,
            provider: provider,
            hospitalName: formatFieldValue(hospital.hospitalName) || 'Unknown Hospital',
            admissionDate: hospital.admissionDate ? 
              new Date(hospital.admissionDate).toLocaleDateString() : 'N/A',
            dischargeDate: hospital.dischargeDate ? 
              new Date(hospital.dischargeDate).toLocaleDateString() : 'N/A',
            reason: formatFieldValue(hospital.reasonForHospitalization),
            treatments: formatArrayValue(hospital.treatmentsReceived),
            attendingDoctors: formatArrayValue(hospital.attendingDoctors),
            dischargeSummary: formatFieldValue(hospital.dischargeSummary),
            investigations: formatArrayValue(hospital.investigationsDone)
          });
        });
      }

      // Extract surgery records
      if (consultation.surgeryRecords && consultation.surgeryRecords.length > 0) {
        consultation.surgeryRecords.forEach(surgery => {
          // Helper function to format field values that might be objects
          const formatFieldValue = (field) => {
            if (!field) return 'N/A';
            if (typeof field === 'object' && field.value !== undefined) {
              return field.unit ? `${field.value} ${field.unit}` : field.value;
            }
            return field;
          };

          records.surgery.push({
            id: surgery._id || `${consultation._id}-surg-${Math.random()}`,
            date: consultationDate,
            provider: provider,
            surgeryType: formatFieldValue(surgery.typeOfSurgery) || 'Unknown Surgery',
            surgeryDate: surgery.date ? new Date(surgery.date).toLocaleDateString() : 'N/A',
            reason: formatFieldValue(surgery.reason),
            complications: formatFieldValue(surgery.complications) || 'None reported',
            recoveryNotes: formatFieldValue(surgery.recoveryNotes)
          });
        });
      }
    });

    setMedicalRecords(records);
  };

  // Handle tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  // Navigate to create consultation
  const handleCreateConsultation = () => {
    navigate(`/provider/consultations/new?patientId=${id}`);
  };

  // Request access to patient records
  const handleRequestAccess = async () => {
    try {
      // Mock API call
      setAccessRequestStatus('pending');
      toast.success('Access request sent to patient');
      
      // Actual API call would be:
      // await PatientService.requestAccess(id);
    } catch (error) {
      console.error('Error requesting access:', error);
      toast.error('Failed to send access request');
    }
  };

  // Render patient demographic information
  const renderPatientInfo = () => {
    if (!patient) return null;
    
    return (
      <div className={styles.patientInfoSection}>
        <div className={styles.patientDetailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Full Name</span>
            <span className={styles.detailValue}>{patient.name}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Gender</span>
            <span className={styles.detailValue}>{patient.gender}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Date of Birth</span>
            <span className={styles.detailValue}>{patient.dateOfBirth}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Age</span>
            <span className={styles.detailValue}>{patient.age}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Email</span>
            <span className={styles.detailValue}>{patient.email}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Phone</span>
            <span className={styles.detailValue}>{patient.phone}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Address</span>
            <span className={styles.detailValue}>{patient.address}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Insurance Provider</span>
            <span className={styles.detailValue}>{patient.insurance.provider}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Insurance Plan</span>
            <span className={styles.detailValue}>{patient.insurance.planType}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Insurance ID</span>
            <span className={styles.detailValue}>{patient.insurance.memberId}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render patient medical history overview
  const renderMedicalHistory = () => {
    if (!patient || !patient.medicalHistory) return null;
    
    return (
      <div className={styles.medicalHistorySection}>
        <h3>Medical History</h3>
        <div className={styles.medicalHistoryGrid}>
          <div className={styles.historyItem}>
            <h4>Chronic Conditions</h4>
            <ul className={styles.historyList}>
              {patient.medicalHistory.chronicConditions.length > 0 ? 
                patient.medicalHistory.chronicConditions.map((condition, index) => (
                  <li key={index}>{condition}</li>
                ))
              : <li>None reported</li>}
            </ul>
          </div>
          <div className={styles.historyItem}>
            <h4>Allergies</h4>
            <ul className={styles.historyList}>
              {patient.medicalHistory.allergies.length > 0 ?
                patient.medicalHistory.allergies.map((allergy, index) => (
                  <li key={index}>{allergy}</li>
                ))
              : <li>None reported</li>}
            </ul>
          </div>
          <div className={styles.historyItem}>
            <h4>Significant Illnesses/Surgeries</h4>
            <ul className={styles.historyList}>
              {patient.medicalHistory.surgeries.length > 0 ?
                patient.medicalHistory.surgeries.map((surgery, index) => (
                  <li key={index}>{surgery}</li>
                ))
              : <li>None reported</li>}
            </ul>
          </div>
          <div className={styles.historyItem}>
            <h4>Family Medical History</h4>
            <ul className={styles.historyList}>
              {patient.medicalHistory.familyHistory.length > 0 ?
                patient.medicalHistory.familyHistory.map((history, index) => (
                  <li key={index}>{history}</li>
                ))
              : <li>None reported</li>}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  // Render patient lifestyle information
  const renderLifestyleInfo = () => {
    if (!patient || !patient.lifestyle) return null;
    
    return (
      <div className={styles.lifestyleSection}>
        <h3>Lifestyle & Habits</h3>
        <div className={styles.lifestyleGrid}>
          <div className={styles.lifestyleItem}>
            <span className={styles.lifestyleLabel}>Smoking:</span>
            <span className={styles.lifestyleValue}>{patient.lifestyle.smoking}</span>
          </div>
          <div className={styles.lifestyleItem}>
            <span className={styles.lifestyleLabel}>Alcohol:</span>
            <span className={styles.lifestyleValue}>{patient.lifestyle.alcohol}</span>
          </div>
          <div className={styles.lifestyleItem}>
            <span className={styles.lifestyleLabel}>Exercise:</span>
            <span className={styles.lifestyleValue}>{patient.lifestyle.exercise}</span>
          </div>
          <div className={styles.lifestyleItem}>
            <span className={styles.lifestyleLabel}>Dietary Preferences:</span>
            <span className={styles.lifestyleValue}>{patient.lifestyle.dietaryPreferences}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render current medications and supplements
  const renderCurrentMedications = () => {
    if (!patient) return null;
    
    return (
      <div className={styles.medicationsSection}>
        <h3>Current Medications & Supplements</h3>
        <div className={styles.medicationsGrid}>
          <div className={styles.medicationsItem}>
            <h4>Medications</h4>
            <ul className={styles.medicationsList}>
              {patient.currentMedications.length > 0 ?
                patient.currentMedications.map((med, index) => (
                  <li key={index}>
                    <strong>{med.name}</strong>
                    {med.dosage && ` - ${med.dosage}`}
                    {med.frequency && ` - ${med.frequency}`}
                  </li>
                ))
              : <li>No current medications</li>}
            </ul>
          </div>
          <div className={styles.medicationsItem}>
            <h4>Supplements</h4>
            <p className={styles.supplementsText}>
              {patient.supplements !== 'N/A' ? patient.supplements : 'No supplements reported'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Render immunization history
  const renderImmunizationHistory = () => {
    if (!patient || !patient.immunisationHistory) return null;
    
    return (
      <div className={styles.immunizationSection}>
        <h3>Immunization History</h3>
        <ul className={styles.immunizationList}>
          {patient.immunisationHistory.length > 0 ?
            patient.immunisationHistory.map((vaccine, index) => (
              <li key={index}>{vaccine}</li>
            ))
          : <li>No immunization records</li>}
        </ul>
      </div>
    );
  };

  // Render emergency contact info
  const renderEmergencyContact = () => {
    if (!patient || !patient.emergencyContact) return null;
    
    return (
      <div className={styles.emergencyContactSection}>
        <h3>Emergency Contact</h3>
        <div className={styles.emergencyContactDetails}>
          <div className={styles.contactItem}>
            <span className={styles.contactLabel}>Name</span>
            <span className={styles.contactValue}>{patient.emergencyContact.name}</span>
          </div>
          <div className={styles.contactItem}>
            <span className={styles.contactLabel}>Relationship</span>
            <span className={styles.contactValue}>{patient.emergencyContact.relationship}</span>
          </div>
          <div className={styles.contactItem}>
            <span className={styles.contactLabel}>Phone</span>
            <span className={styles.contactValue}>{patient.emergencyContact.phone}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render recent consultations for overview tab
  const renderRecentConsultations = () => {
    if (!consultations || consultations.length === 0) {
      return (
        <div className={styles.noConsultations}>
          No consultations available
        </div>
      );
    }
    
    // Show only the 3 most recent consultations in overview
    const recentConsultations = consultations.slice(0, 3);
    
    return (
      <div className={styles.consultationsSection}>
        <h3>Recent Consultations</h3>
        <div className={styles.consultationsList}>
          {recentConsultations.map(consultation => (
            <div key={consultation.id} className={styles.consultationItem}>
              <div className={styles.consultationHeader}>
                <div className={styles.consultationDate}>{consultation.date}</div>
                <div className={styles.consultationProvider}>{consultation.provider}</div>
                <span className={styles[`status-${consultation.status}`]}>{consultation.status}</span>
              </div>
              <div className={styles.consultationReason}>
                <span className={styles.reasonLabel}>Reason:</span> {consultation.reason}
              </div>
              <div className={styles.consultationSpecialty}>
                <span className={styles.specialtyLabel}>Specialty:</span> {consultation.specialty}
              </div>
            </div>
          ))}
        </div>
        {consultations.length > 3 && (
          <div className={styles.viewAllConsultations}>
            <Button variant="tertiary" onClick={() => handleTabChange('consultations')}>
              View All Consultations ({consultations.length})
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Render full consultations tab
  const renderConsultationsTab = () => {
    if (!consultations || consultations.length === 0) {
      return (
        <div className={styles.noRecords}>
          <h3>No Consultations Found</h3>
          <p>This patient has no consultation records.</p>
          <Button variant="primary" onClick={handleCreateConsultation}>
            Create First Consultation
          </Button>
        </div>
      );
    }
    
    return (
      <div className={styles.consultationsTab}>
        <div className={styles.consultationsHeader}>
          <h3>All Consultations ({consultations.length})</h3>
          <Button variant="primary" onClick={handleCreateConsultation}>
            New Consultation
          </Button>
        </div>
        
        <div className={styles.consultationsGrid}>
          {consultations.map(consultation => (
            <Card key={consultation.id} className={styles.consultationCard}>
              <div className={styles.consultationCardHeader}>
                <div className={styles.consultationMeta}>
                  <span className={styles.consultationDate}>{consultation.date}</span>
                  <span className={styles[`status-${consultation.status}`]}>{consultation.status}</span>
                </div>
                <div className={styles.consultationActions}>
                  <Link to={`/provider/consultations/${consultation.id}`}>
                    <Button variant="tertiary" size="small">View</Button>
                  </Link>
                  {consultation.status === 'draft' && (
                    <Link to={`/provider/consultations/${consultation.id}/edit`}>
                      <Button variant="secondary" size="small">Edit</Button>
                    </Link>
                  )}
                </div>
              </div>
              
              <div className={styles.consultationDetails}>
                <div className={styles.consultationField}>
                  <span className={styles.fieldLabel}>Provider:</span>
                  <span className={styles.fieldValue}>{consultation.provider}</span>
                </div>
                <div className={styles.consultationField}>
                  <span className={styles.fieldLabel}>Specialty:</span>
                  <span className={styles.fieldValue}>{consultation.specialty}</span>
                </div>
                <div className={styles.consultationField}>
                  <span className={styles.fieldLabel}>Practice:</span>
                  <span className={styles.fieldValue}>{consultation.practice}</span>
                </div>
                <div className={styles.consultationField}>
                  <span className={styles.fieldLabel}>Reason:</span>
                  <span className={styles.fieldValue}>{consultation.reason}</span>
                </div>
                {consultation.notes && consultation.notes !== 'No notes' && (
                  <div className={styles.consultationField}>
                    <span className={styles.fieldLabel}>Notes:</span>
                    <span className={styles.fieldValue}>{consultation.notes}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // Render medical records tabs
  const renderMedicalRecordsTab = (recordType) => {
    const records = medicalRecords[recordType] || [];
    
    if (records.length === 0) {
      return (
        <div className={styles.noRecords}>
          <h3>No {recordType.charAt(0).toUpperCase() + recordType.slice(1)} Records</h3>
          <p>No {recordType} data has been recorded for this patient yet.</p>
          <Button variant="primary" onClick={handleCreateConsultation}>
            Create New Consultation
          </Button>
        </div>
      );
    }

    switch (recordType) {
      case 'vitals':
        return (
          <div className={styles.vitalsTab}>
            <div className={styles.recordsHeader}>
              <h3>Vitals Records ({records.length})</h3>
            </div>
            <div className={styles.recordsGrid}>
              {records.map(record => (
                <Card key={record.id} className={styles.recordCard}>
                  <div className={styles.recordHeader}>
                    <span className={styles.recordDate}>{record.date}</span>
                    <span className={styles.recordProvider}>{record.provider}</span>
                  </div>
                  <div className={styles.vitalsGrid}>
                    <div className={styles.vitalItem}>
                      <span className={styles.vitalLabel}>Heart Rate:</span>
                      <span className={styles.vitalValue}>{record.heartRate} bpm</span>
                    </div>
                    <div className={styles.vitalItem}>
                      <span className={styles.vitalLabel}>Blood Pressure:</span>
                      <span className={styles.vitalValue}>{record.bloodPressure} mmHg</span>
                    </div>
                    <div className={styles.vitalItem}>
                      <span className={styles.vitalLabel}>Temperature:</span>
                      <span className={styles.vitalValue}>{record.bodyTemperature}°F</span>
                    </div>
                    <div className={styles.vitalItem}>
                      <span className={styles.vitalLabel}>Respiratory Rate:</span>
                      <span className={styles.vitalValue}>{record.respiratoryRate}/min</span>
                    </div>
                    <div className={styles.vitalItem}>
                      <span className={styles.vitalLabel}>O2 Saturation:</span>
                      <span className={styles.vitalValue}>{record.bloodOxygenSaturation}%</span>
                    </div>
                    <div className={styles.vitalItem}>
                      <span className={styles.vitalLabel}>Weight:</span>
                      <span className={styles.vitalValue}>{record.weight} lbs</span>
                    </div>
                    <div className={styles.vitalItem}>
                      <span className={styles.vitalLabel}>Height:</span>
                      <span className={styles.vitalValue}>{record.height} inches</span>
                    </div>
                    <div className={styles.vitalItem}>
                      <span className={styles.vitalLabel}>BMI:</span>
                      <span className={styles.vitalValue}>{record.bmi}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'medications':
        return (
          <div className={styles.medicationsTab}>
            <div className={styles.recordsHeader}>
              <h3>Medications ({records.length})</h3>
            </div>
            <div className={styles.recordsList}>
              {records.map(record => (
                <Card key={record.id} className={styles.recordCard}>
                  <div className={styles.recordHeader}>
                    <h4>{record.name}</h4>
                    <span className={styles.recordDate}>{record.date}</span>
                  </div>
                  <div className={styles.medicationDetails}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Dosage:</span>
                      <span className={styles.detailValue}>{record.dosage}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Frequency:</span>
                      <span className={styles.detailValue}>{record.frequency}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Reason:</span>
                      <span className={styles.detailValue}>{record.reason}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Start Date:</span>
                      <span className={styles.detailValue}>{record.startDate}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>End Date:</span>
                      <span className={styles.detailValue}>{record.endDate}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Prescribed by:</span>
                      <span className={styles.detailValue}>{record.provider}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'immunizations':
        return (
          <div className={styles.immunizationsTab}>
            <div className={styles.recordsHeader}>
              <h3>Immunizations ({records.length})</h3>
            </div>
            <div className={styles.recordsList}>
              {records.map(record => (
                <Card key={record.id} className={styles.recordCard}>
                  <div className={styles.recordHeader}>
                    <h4>{record.vaccineName}</h4>
                    <span className={styles.recordDate}>{record.date}</span>
                  </div>
                  <div className={styles.immunizationDetails}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Date Administered:</span>
                      <span className={styles.detailValue}>{record.dateAdministered}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Serial Number:</span>
                      <span className={styles.detailValue}>{record.serialNumber}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Next Due Date:</span>
                      <span className={styles.detailValue}>{record.nextDueDate}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Administered by:</span>
                      <span className={styles.detailValue}>{record.provider}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'labResults':
        return (
          <div className={styles.labResultsTab}>
            <div className={styles.recordsHeader}>
              <h3>Lab Results ({records.length})</h3>
            </div>
            <div className={styles.recordsList}>
              {records.map(record => (
                <Card key={record.id} className={styles.recordCard}>
                  <div className={styles.recordHeader}>
                    <h4>{record.testName}</h4>
                    <span className={styles.recordDate}>{record.date}</span>
                  </div>
                  <div className={styles.labDetails}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Lab:</span>
                      <span className={styles.detailValue}>{record.labName}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Test Date:</span>
                      <span className={styles.detailValue}>{record.testDate}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Results:</span>
                      <span className={styles.detailValue}>{record.results}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Comments:</span>
                      <span className={styles.detailValue}>{record.comments}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Ordered by:</span>
                      <span className={styles.detailValue}>{record.provider}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'radiology':
        return (
          <div className={styles.radiologyTab}>
            <div className={styles.recordsHeader}>
              <h3>Radiology Reports ({records.length})</h3>
            </div>
            <div className={styles.recordsList}>
              {records.map(record => (
                <Card key={record.id} className={styles.recordCard}>
                  <div className={styles.recordHeader}>
                    <h4>{record.scanType}</h4>
                    <span className={styles.recordDate}>{record.date}</span>
                  </div>
                  <div className={styles.radiologyDetails}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Scan Date:</span>
                      <span className={styles.detailValue}>{record.scanDate}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Body Part:</span>
                      <span className={styles.detailValue}>{record.bodyPart}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Findings:</span>
                      <span className={styles.detailValue}>{record.findings}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Recommendations:</span>
                      <span className={styles.detailValue}>{record.recommendations}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Provider:</span>
                      <span className={styles.detailValue}>{record.provider}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'hospital':
        return (
          <div className={styles.hospitalTab}>
            <div className={styles.recordsHeader}>
              <h3>Hospital Records ({records.length})</h3>
            </div>
            <div className={styles.recordsList}>
              {records.map(record => (
                <Card key={record.id} className={styles.recordCard}>
                  <div className={styles.recordHeader}>
                    <h4>{record.hospitalName}</h4>
                    <span className={styles.recordDate}>{record.date}</span>
                  </div>
                  <div className={styles.hospitalDetails}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Admission Date:</span>
                      <span className={styles.detailValue}>{record.admissionDate}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Discharge Date:</span>
                      <span className={styles.detailValue}>{record.dischargeDate}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Reason:</span>
                      <span className={styles.detailValue}>{record.reason}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Treatments:</span>
                      <span className={styles.detailValue}>{record.treatments}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Attending Doctors:</span>
                      <span className={styles.detailValue}>{record.attendingDoctors}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Discharge Summary:</span>
                      <span className={styles.detailValue}>{record.dischargeSummary}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'surgery':
        return (
          <div className={styles.surgeryTab}>
            <div className={styles.recordsHeader}>
              <h3>Surgery Records ({records.length})</h3>
            </div>
            <div className={styles.recordsList}>
              {records.map(record => (
                <Card key={record.id} className={styles.recordCard}>
                  <div className={styles.recordHeader}>
                    <h4>{record.surgeryType}</h4>
                    <span className={styles.recordDate}>{record.date}</span>
                  </div>
                  <div className={styles.surgeryDetails}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Surgery Date:</span>
                      <span className={styles.detailValue}>{record.surgeryDate}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Reason:</span>
                      <span className={styles.detailValue}>{record.reason}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Complications:</span>
                      <span className={styles.detailValue}>{record.complications}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Recovery Notes:</span>
                      <span className={styles.detailValue}>{record.recoveryNotes}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Surgeon:</span>
                      <span className={styles.detailValue}>{record.provider}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className={styles.noRecords}>
            No {recordType} records available
          </div>
        );
    }
  };

  // Render content based on active tab
  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className={styles.loadingContainer}>
          <LoadingSpinner />
          <p>Loading patient data...</p>
        </div>
      );
    }
    
    if (!patient) {
      return <div className={styles.notFound}>Patient not found</div>;
    }
    
    switch (activeTab) {
      case 'overview':
        return (
          <div className={styles.overviewTab}>
            {patient?.accessLevel === 'pending' || patient?.accessLevel === 'limited' ? (
              <Card className={styles.limitedAccessCard}>
                <div className={styles.limitedAccessContent}>
                  <h3>Limited Patient Information</h3>
                  <p>You currently have {patient.accessLevel === 'pending' ? 'pending' : 'limited'} access to this patient's information.</p>
                  
                  <div className={styles.basicInfo}>
                    <h4>Basic Information</h4>
                    <p><strong>Name:</strong> {patient.name}</p>
                    <p><strong>Email:</strong> {patient.email}</p>
                  </div>
                  
                  {patient.accessLevel === 'pending' ? (
                    <div className={styles.pendingMessage}>
                      <p>Your request for full access is pending approval from the patient.</p>
                    </div>
                  ) : (
                    <div>
                      <p>With limited access, you can:</p>
                      <ul>
                        <li>View and create consultations for this patient</li>
                        <li>Access medical records from consultations you create</li>
                      </ul>
                      <p>To view the patient's complete medical history and profile information, you need to request full access.</p>
                      {!accessRequestStatus && (
                        <Button 
                          variant="primary" 
                          onClick={handleRequestAccess}
                          className={styles.requestAccessBtn}
                        >
                          Request Full Access
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <>
                <Card className={styles.infoCard}>
                  {renderPatientInfo()}
                </Card>
                
                <Card className={styles.medicalHistoryCard}>
                  {renderMedicalHistory()}
                </Card>
                
                <Card className={styles.emergencyContactCard}>
                  {renderEmergencyContact()}
                </Card>
                
                <Card className={styles.lifestyleCard}>
                  {renderLifestyleInfo()}
                </Card>
                
                <Card className={styles.medicationsCard}>
                  {renderCurrentMedications()}
                </Card>
                
                <Card className={styles.immunizationCard}>
                  {renderImmunizationHistory()}
                </Card>
                
                <Card className={styles.consultationsCard}>
                  {renderRecentConsultations()}
                </Card>
              </>
            )}
          </div>
        );
      case 'consultations':
        return (
          <Card className={styles.medicalRecordCard}>
            {renderConsultationsTab()}
          </Card>
        );
      case 'vitals':
      case 'medications':
      case 'immunizations':
      case 'lab-results':
      case 'radiology':
      case 'hospital':
      case 'surgery':
        const recordType = activeTab === 'lab-results' ? 'labResults' : activeTab;
        return (
          <Card className={styles.medicalRecordCard}>
            {renderMedicalRecordsTab(recordType)}
          </Card>
        );
      default:
        return (
          <div className={styles.accessLimited}>
            {patient?.accessLevel === 'full' ? (
              <div className={styles.noRecords}>
                No {activeTab} records available for this patient
              </div>
            ) : (
              <div className={styles.limitedAccess}>
                <p>You have limited access to this patient's {activeTab} records.</p>
                {!accessRequestStatus && (
                  <Button 
                    variant="secondary" 
                    onClick={handleRequestAccess}
                    className={styles.requestAccessBtn}
                  >
                    Request Access
                  </Button>
                )}
                {accessRequestStatus === 'pending' && (
                  <div className={styles.pendingRequest}>
                    Access request is pending approval from patient
                  </div>
                )}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className={styles.viewPatientContainer}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <Link to="/provider/patients" className={styles.breadcrumbLink}>All Patients</Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span className={styles.currentPage}>
            {isLoading ? 'Loading...' : patient?.name || 'Patient Details'}
          </span>
        </div>
        
        <div className={styles.headerContent}>
          <div className={styles.patientMeta}>
            <h1 className={styles.patientName}>
              {isLoading ? 'Loading...' : patient?.name}
              {patient?.accessLevel === 'limited' && (
                <span className={styles.accessBadge}>Limited Access</span>
              )}
              {patient?.accessLevel === 'pending' && (
                <span className={styles.pendingBadge}>Pending</span>
              )}
            </h1>
            {patient && (
              <div className={styles.patientBasicInfo}>
                <span>{patient.gender}</span>
                <span className={styles.infoSeparator}>•</span>
                <span>{patient.age} years</span>
                <span className={styles.infoSeparator}>•</span>
                <span>ID: {patient.id}</span>
              </div>
            )}
          </div>
          
          <div className={styles.actionButtons}>
            {patient && patient.accessLevel !== 'pending' && (
              <Button 
                variant="primary" 
                className={styles.newConsultationBtn}
                onClick={handleCreateConsultation}
                disabled={!verificationStatus}
              >
                New Consultation
              </Button>
            )}
            {patient && patient.accessLevel === 'limited' && !accessRequestStatus && (
              <Button 
                variant="secondary" 
                className={styles.requestAccessBtn}
                onClick={handleRequestAccess}
              >
                Request Full Access
              </Button>
            )}
            {accessRequestStatus === 'pending' && (
              <div className={styles.pendingRequestBadge}>
                Access Request Pending
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className={styles.tabsContainer}>
        <Tabs 
          tabs={recordTabs} 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
        />
      </div>
      
      <div className={styles.contentContainer}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ProviderViewPatient; 