import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import styles from './AddConsultation.module.css';

// Component imports
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Tabs from '../../components/common/Tabs';
import ConsultationForm from '../../components/forms/ConsultationForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PatientService from '../../services/patient.service';
import ConsultationService from '../../services/consultation.service';
import ApiService from '../../services/api.service';
import FileService from '../../services/file.service';

const AddConsultation = () => {
  const { patientId: paramPatientId, id: consultationId } = useParams();
  const [searchParams] = useSearchParams();
  const queryPatientId = searchParams.get('patientId');
  const queryPatientEmail = searchParams.get('patientEmail');
  
  // Use patientId from params first, then from query
  const patientId = paramPatientId || queryPatientId;
  const patientEmail = queryPatientEmail;
  
  // Determine if we're editing an existing consultation
  const isEditing = !!consultationId;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [patient, setPatient] = useState(null);
  const [providerProfile, setProviderProfile] = useState(null);
  const [consultationData, setConsultationData] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  
  const navigate = useNavigate();
  const user = useSelector(state => state.auth.user);
  
  // Define the form tabs
  const formTabs = [
    { id: 'general', label: 'General' },
    { id: 'vitals', label: 'Vitals' },
    { id: 'medication', label: 'Medication' },
    { id: 'immunization', label: 'Immunization' },
    { id: 'labResults', label: 'Lab Results' },
    { id: 'radiology', label: 'Radiology' },
    { id: 'hospital', label: 'Hospital' },
    { id: 'surgery', label: 'Surgery' }
  ];
  
  // Function to create initial form values with provider profile data
  const getInitialFormValues = () => {
    if (isEditing && consultationData) {
      // When editing, populate with existing consultation data
      return {
        general: {
          date: consultationData.date ? new Date(consultationData.date).toISOString().substr(0, 10) : new Date().toISOString().substr(0, 10),
          specialistName: consultationData.general?.specialistName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          specialty: consultationData.general?.specialty || providerProfile?.specialty || '',
          practiceName: consultationData.general?.practice || providerProfile?.practiceInfo?.name || '',
          reasonForVisit: consultationData.general?.reasonForVisit || '',
          notes: consultationData.general?.notes || ''
        },
        vitals: {
          heartRate: '',
          bloodPressure: { systolic: '', diastolic: '' },
          bodyTemperature: '',
          respiratoryRate: '',
          bloodGlucose: '',
          bloodOxygenSaturation: '',
          bmi: '',
          bodyFatPercentage: '',
          weight: '',
          height: ''
        },
        medication: consultationData.medications || [],
        immunization: consultationData.immunizations || [],
        labResults: consultationData.labResults || [],
        radiology: consultationData.radiologyReports || [],
        hospital: consultationData.hospitalRecords || [],
        surgery: consultationData.surgeryRecords || [],
        attachments: consultationData.attachments || []
      };
    } else {
      // When creating new, use provider profile defaults
      return {
        general: {
          date: new Date().toISOString().substr(0, 10),
          specialistName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          specialty: providerProfile?.specialty || '',
          practiceName: providerProfile?.practiceInfo?.name || '',
          reasonForVisit: '',
          notes: ''
        },
        vitals: {
          heartRate: '',
          bloodPressure: { systolic: '', diastolic: '' },
          bodyTemperature: '',
          respiratoryRate: '',
          bloodGlucose: '',
          bloodOxygenSaturation: '',
          bmi: '',
          bodyFatPercentage: '',
          weight: '',
          height: ''
        },
        medication: [],
        immunization: [],
        labResults: [],
        radiology: [],
        hospital: [],
        surgery: [],
        attachments: []
      };
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      // Fetch provider profile data first
      await fetchProviderProfile();
      
      if (isEditing) {
        // If editing, fetch the consultation data
        await fetchConsultationData();
      } else {
        // If creating new, fetch patient data
        if (patientId) {
          await fetchPatientData();
        } else if (patientEmail) {
          // If we only have email, we'll send it with consultation creation
          setPatient({
            email: patientEmail,
            name: patientEmail,
            gender: 'Unknown',
            age: 'Unknown',
            insurance: 'Unknown'
          });
          setIsLoading(false);
        } else {
          // No patient specified
          toast.error('No patient specified for consultation');
          navigate('/provider/patients');
        }
      }
    };
    
    fetchData();
  }, [patientId, patientEmail, consultationId, isEditing]);
  
  const fetchProviderProfile = async () => {
    try {
      const response = await ApiService.get('/provider/profile');
      
      if (response.success && response.provider) {
        const provider = response.provider;
        const providerProfileData = provider.providerProfile || {};
        
        setProviderProfile(providerProfileData);
      }
    } catch (error) {
      console.error('Error fetching provider profile:', error);
      // Don't show error toast as this is optional data for auto-population
    }
  };
  
  const fetchConsultationData = async () => {
    try {
      const response = await ApiService.get(`/consultations/${consultationId}`);
      
      if (response) {
        setConsultationData(response);
        
        // Set patient data from consultation
        if (response.patient) {
          setPatient({
            id: response.patient._id,
            name: `${response.patient.firstName || ''} ${response.patient.lastName || ''}`.trim() || 'Unknown',
            gender: 'Unknown', // You might want to get this from patient profile
            age: 'Unknown',    // You might want to calculate this
            insurance: 'Unknown',
            email: response.patient.email
          });
        }
        
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching consultation data:', error);
      toast.error('Failed to load consultation data');
      navigate('/provider/consultations');
    }
  };
  
  const fetchPatientData = async () => {
    try {
      console.log('Fetching patient data for ID:', patientId);
      // Fetch patient data using the service
      const response = await PatientService.getPatientById(patientId);
      console.log('Patient service response:', response);
      
      if (response && response.patient) {
        const patientData = response.patient;
        console.log('Patient data received:', patientData);
        
        setPatient({
          id: patientData._id,
          name: `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Unknown',
          gender: patientData.patientProfile?.gender || 'Unknown',
          age: patientData.patientProfile?.dateOfBirth ? 
            calculateAge(patientData.patientProfile.dateOfBirth) : 'Unknown',
          insurance: patientData.patientProfile?.healthInsurance?.provider || 'Unknown',
          email: patientData.email
        });
        console.log('Patient state set successfully');
        setIsLoading(false);
      } else if (response && response.success === false) {
        console.error('API returned error:', response.message);
        toast.error(response.message || 'Failed to load patient information');
        setPatient(null);
        setIsLoading(false);
      } else {
        console.error('No patient data in response:', response);
        toast.error('Failed to load patient information');
        setPatient(null);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching patient data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch patient data';
      toast.error(errorMessage);
      setPatient(null);
      setIsLoading(false);
    }
  };
  
  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
  
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };
  
  const handleSaveDraft = async (formData) => {
    setIsSaving(true);
    try {
      console.log('handleSaveDraft called with formData:', formData);
      
      // Extract date from general and move to top level
      const { date, ...generalWithoutDate } = formData.general;
      
      // Transform vitals data to match backend schema
      const transformedVitals = formData.vitals ? {
        heartRate: formData.vitals.heartRate ? { value: formData.vitals.heartRate } : undefined,
        bloodPressure: formData.vitals.bloodPressure,  // Already an object with systolic/diastolic
        bodyTemperature: formData.vitals.bodyTemperature ? { value: formData.vitals.bodyTemperature } : undefined,
        respiratoryRate: formData.vitals.respiratoryRate ? { value: formData.vitals.respiratoryRate } : undefined,
        bloodGlucose: formData.vitals.bloodGlucose ? { value: formData.vitals.bloodGlucose } : undefined,
        bloodOxygenSaturation: formData.vitals.bloodOxygenSaturation ? { value: formData.vitals.bloodOxygenSaturation } : undefined,
        bmi: formData.vitals.bmi ? { value: formData.vitals.bmi } : undefined,
        bodyFatPercentage: formData.vitals.bodyFatPercentage ? { value: formData.vitals.bodyFatPercentage } : undefined,
        weight: formData.vitals.weight ? { value: formData.vitals.weight } : undefined,
        height: formData.vitals.height ? { value: formData.vitals.height } : undefined
      } : {};
      
      // Transform medication data to match backend schema
      const transformedMedication = formData.medication.map(med => ({
        ...med,
        reasonForPrescription: med.reason,
        reason: undefined
      }));
      
      // Transform immunization data to match backend schema
      const transformedImmunization = formData.immunization.map(imm => ({
        ...imm,
        vaccineName: imm.name,
        dateAdministered: imm.date,
        vaccineSerialNumber: imm.serialNumber,
        name: undefined,
        date: undefined,
        serialNumber: undefined
      }));
      
      // Transform lab results data to match backend schema
      const transformedLabResults = formData.labResults.map(lab => ({
        ...lab,
        dateOfTest: lab.date,
        date: undefined
      }));
      
      // Transform radiology data to match backend schema
      const transformedRadiology = formData.radiology.map(rad => ({
        ...rad,
        typeOfScan: rad.scanType,
        bodyPartExamined: rad.bodyPart,
        scanType: undefined,
        bodyPart: undefined
      }));
      
      // Transform hospital data to match backend schema
      const transformedHospital = formData.hospital.map(hosp => ({
        ...hosp,
        hospitalName: hosp.hospitalName || 'Not specified',
        reasonForHospitalization: hosp.reason,
        treatmentsReceived: hosp.treatments ? hosp.treatments.split(',').map(t => t.trim()) : [],
        investigationsDone: hosp.investigations ? hosp.investigations.split(',').map(i => i.trim()) : [],
        attendingDoctors: hosp.attendingDoctors ? [{name: hosp.attendingDoctors}] : [],
        reason: undefined,
        treatments: undefined,
        investigations: undefined
      }));
      
      // Transform surgery data to match backend schema
      const transformedSurgery = formData.surgery.map(surg => ({
        ...surg,
        typeOfSurgery: surg.type,
        type: undefined
      }));
      
      // Store files separately - we'll upload them after consultation creation
      const filesToUpload = formData.attachments || [];
      
      // Restructure the form data to match backend expectations (without attachments)
      const consultationData = {
        ...(patient.id ? { patient: patient.id } : { patientEmail: patient.email }),
        date: date, // Date at top level
        general: {
          ...generalWithoutDate,
          practice: generalWithoutDate.practiceName // Map practiceName to practice
        },
        vitals: transformedVitals,
        medication: transformedMedication,
        immunization: transformedImmunization,
        labResults: transformedLabResults,
        radiology: transformedRadiology,
        hospital: transformedHospital,
        surgery: transformedSurgery,
        attachments: [], // Empty initially, we'll upload files separately
        status: 'draft'
      };
      
      // Remove practiceName from general as it's now mapped to practice
      delete consultationData.general.practiceName;
      
      let response;
      if (isEditing) {
        response = await ConsultationService.updateConsultation(consultationId, consultationData);
      } else {
        response = await ConsultationService.createConsultation(consultationData);
      }
      
      if (response && (response._id || response.id)) {
        const consultationId = response._id || response.id;
        
        // Upload files if any
        if (filesToUpload.length > 0) {
          console.log(`Uploading ${filesToUpload.length} files for draft consultation ${consultationId}`);
          
          try {
            // Upload each file
            for (const file of filesToUpload) {
              // Skip if it's not a File object (could be existing attachment data)
              if (!(file instanceof File)) {
                continue;
              }
              
              console.log(`Uploading file: ${file.name}`);
              await FileService.uploadConsultationFile(consultationId, file);
            }
            
            toast.success(isEditing ? 'Consultation draft updated successfully with attachments' : 'Consultation draft saved successfully with attachments');
          } catch (uploadError) {
            console.error('Error uploading files:', uploadError);
            toast.warning('Draft saved but some files failed to upload');
          }
        } else {
          toast.success(isEditing ? 'Consultation draft updated successfully' : 'Consultation draft saved successfully');
        }
        
        navigate('/provider/consultations');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save consultation draft');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSubmit = async (formData) => {
    setIsSaving(true);
    try {
      console.log('handleSubmit called with formData:', formData);
      console.log('Current patient state:', patient);
      
      // Check if patient data is available
      if (!patient) {
        toast.error('Patient information is not available');
        return;
      }
      
      // Extract date from general and move to top level
      const { date, ...generalWithoutDate } = formData.general;
      
      // Transform vitals data to match backend schema
      const transformedVitals = formData.vitals ? {
        heartRate: formData.vitals.heartRate ? { value: formData.vitals.heartRate } : undefined,
        bloodPressure: formData.vitals.bloodPressure,  // Already an object with systolic/diastolic
        bodyTemperature: formData.vitals.bodyTemperature ? { value: formData.vitals.bodyTemperature } : undefined,
        respiratoryRate: formData.vitals.respiratoryRate ? { value: formData.vitals.respiratoryRate } : undefined,
        bloodGlucose: formData.vitals.bloodGlucose ? { value: formData.vitals.bloodGlucose } : undefined,
        bloodOxygenSaturation: formData.vitals.bloodOxygenSaturation ? { value: formData.vitals.bloodOxygenSaturation } : undefined,
        bmi: formData.vitals.bmi ? { value: formData.vitals.bmi } : undefined,
        bodyFatPercentage: formData.vitals.bodyFatPercentage ? { value: formData.vitals.bodyFatPercentage } : undefined,
        weight: formData.vitals.weight ? { value: formData.vitals.weight } : undefined,
        height: formData.vitals.height ? { value: formData.vitals.height } : undefined
      } : {};
      
      // Transform medication data to match backend schema
      const transformedMedication = formData.medication.map(med => ({
        ...med,
        reasonForPrescription: med.reason,
        reason: undefined
      }));
      
      // Transform immunization data to match backend schema
      const transformedImmunization = formData.immunization.map(imm => ({
        ...imm,
        vaccineName: imm.name,
        dateAdministered: imm.date,
        vaccineSerialNumber: imm.serialNumber,
        name: undefined,
        date: undefined,
        serialNumber: undefined
      }));
      
      // Transform lab results data to match backend schema
      const transformedLabResults = formData.labResults.map(lab => ({
        ...lab,
        dateOfTest: lab.date,
        date: undefined
      }));
      
      // Transform radiology data to match backend schema
      const transformedRadiology = formData.radiology.map(rad => ({
        ...rad,
        typeOfScan: rad.scanType,
        bodyPartExamined: rad.bodyPart,
        scanType: undefined,
        bodyPart: undefined
      }));
      
      // Transform hospital data to match backend schema
      const transformedHospital = formData.hospital.map(hosp => ({
        ...hosp,
        hospitalName: hosp.hospitalName || 'Not specified',
        reasonForHospitalization: hosp.reason,
        treatmentsReceived: hosp.treatments ? hosp.treatments.split(',').map(t => t.trim()) : [],
        investigationsDone: hosp.investigations ? hosp.investigations.split(',').map(i => i.trim()) : [],
        attendingDoctors: hosp.attendingDoctors ? [{name: hosp.attendingDoctors}] : [],
        reason: undefined,
        treatments: undefined,
        investigations: undefined
      }));
      
      // Transform surgery data to match backend schema
      const transformedSurgery = formData.surgery.map(surg => ({
        ...surg,
        typeOfSurgery: surg.type,
        type: undefined
      }));
      
      // Store files separately - we'll upload them after consultation creation
      const filesToUpload = formData.attachments || [];
      
      // Restructure the form data to match backend expectations (without attachments)
      const consultationData = {
        ...(patient.id ? { patient: patient.id } : { patientEmail: patient.email }),
        date: date, // Date at top level
        general: {
          ...generalWithoutDate,
          practice: generalWithoutDate.practiceName // Map practiceName to practice
        },
        vitals: transformedVitals,
        medication: transformedMedication,
        immunization: transformedImmunization,
        labResults: transformedLabResults,
        radiology: transformedRadiology,
        hospital: transformedHospital,
        surgery: transformedSurgery,
        attachments: [], // Empty initially, we'll upload files separately
        status: 'completed'
      };
      
      // Remove practiceName from general as it's now mapped to practice
      delete consultationData.general.practiceName;
      
      console.log('Sending consultation data:', consultationData);
      
      let response;
      if (isEditing) {
        response = await ConsultationService.updateConsultation(consultationId, consultationData);
      } else {
        response = await ConsultationService.createConsultation(consultationData);
      }
      
      if (response && (response._id || response.id)) {
        const consultationId = response._id || response.id;
        
        // Upload files if any
        if (filesToUpload.length > 0) {
          console.log(`Uploading ${filesToUpload.length} files for consultation ${consultationId}`);
          
          try {
            // Upload each file
            for (const file of filesToUpload) {
              // Skip if it's not a File object (could be existing attachment data)
              if (!(file instanceof File)) {
                continue;
              }
              
              console.log(`Uploading file: ${file.name}`);
              await FileService.uploadConsultationFile(consultationId, file);
            }
            
            toast.success(isEditing ? 'Consultation updated successfully with attachments' : 'Consultation saved successfully with attachments');
          } catch (uploadError) {
            console.error('Error uploading files:', uploadError);
            toast.warning('Consultation saved but some files failed to upload');
          }
        } else {
          toast.success(isEditing ? 'Consultation updated successfully' : 'Consultation saved successfully');
        }
        
        navigate('/provider/consultations');
      }
    } catch (error) {
      console.error('Error saving consultation:', error);
      toast.error('Failed to save consultation');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
        <p>{isEditing ? 'Loading consultation data...' : 'Loading patient data...'}</p>
      </div>
    );
  }
  
  // Check if patient data is available
  if (!patient) {
    return (
      <div className={styles.loadingContainer}>
        <p>No patient data available. Please select a patient first.</p>
        <Button onClick={() => navigate('/provider/patients')}>
          Go to Patients
        </Button>
      </div>
    );
  }
  
  // When editing, ensure consultation data is loaded
  if (isEditing && !consultationData) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
        <p>Loading consultation data...</p>
      </div>
    );
  }
  
  return (
    <div className={styles.consultationContainer}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Link to={isEditing ? "/provider/consultations" : "/provider/patients"} className={styles.backLink}>
            &larr; Back to {isEditing ? "Consultations" : "Patients"}
          </Link>
          <h1>{isEditing ? "Edit Consultation" : "New Consultation"}</h1>
          <p>{isEditing ? "Edit the consultation record for your patient" : "Add a new consultation record for your patient"}</p>
        </div>
      </div>
      
      {patient && (
        <div className={styles.patientInfo}>
          <div className={styles.patientAvatar}></div>
          <div className={styles.patientDetails}>
            <h2>{patient.name}</h2>
            <div className={styles.patientMetadata}>
              <span>Gender: {patient.gender}</span>
              <span>Age: {patient.age}</span>
              <span>Insurance: {patient.insurance}</span>
            </div>
          </div>
        </div>
      )}
      
      <Card className={styles.formCard}>
        <Tabs 
          tabs={formTabs} 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
        />
        
        <ConsultationForm 
          key={isEditing ? `edit-${consultationId}` : 'new'}
          initialValues={getInitialFormValues()}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmit}
          isSaving={isSaving}
        />
      </Card>
    </div>
  );
};

export default AddConsultation; 