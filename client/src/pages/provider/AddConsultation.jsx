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

const AddConsultation = () => {
  const { patientId: paramPatientId } = useParams();
  const [searchParams] = useSearchParams();
  const queryPatientId = searchParams.get('patientId');
  const queryPatientEmail = searchParams.get('patientEmail');
  
  // Use patientId from params first, then from query
  const patientId = paramPatientId || queryPatientId;
  const patientEmail = queryPatientEmail;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [patient, setPatient] = useState(null);
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
  
  // Initial form values
  const initialFormValues = {
    general: {
      date: new Date().toISOString().substr(0, 10),
      specialistName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      specialty: user?.providerProfile?.specialty || '',
      practiceName: user?.providerProfile?.practiceInfo?.name || '',
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
  
  useEffect(() => {
    // Fetch patient data if we have a patientId
    if (patientId) {
      fetchPatientData();
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
  }, [patientId, patientEmail]);
  
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
      
      // Restructure the form data to match backend expectations
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
        attachments: formData.attachments,
        status: 'draft'
      };
      
      // Remove practiceName from general as it's now mapped to practice
      delete consultationData.general.practiceName;
      
      const response = await ConsultationService.createConsultation(consultationData);
      
      if (response && response._id) {
        toast.success('Consultation draft saved successfully');
        navigate(`/provider/consultations/${response._id}/edit`);
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
      
      // Restructure the form data to match backend expectations
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
        attachments: formData.attachments,
        status: 'completed'
      };
      
      // Remove practiceName from general as it's now mapped to practice
      delete consultationData.general.practiceName;
      
      console.log('Sending consultation data:', consultationData);
      
      const response = await ConsultationService.createConsultation(consultationData);
      
      if (response && response._id) {
        toast.success('Consultation saved successfully');
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
        <p>Loading patient data...</p>
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
  
  return (
    <div className={styles.consultationContainer}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Link to="/provider/patients" className={styles.backLink}>
            &larr; Back to Patients
          </Link>
          <h1>New Consultation</h1>
          <p>Add a new consultation record for your patient</p>
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
          initialValues={initialFormValues}
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