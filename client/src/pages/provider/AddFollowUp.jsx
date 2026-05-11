import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import styles from './AddConsultation.module.css';

import Card from '../../components/common/Card';
import Tabs from '../../components/common/Tabs';
import ConsultationForm from '../../components/forms/ConsultationForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConsultationService from '../../services/consultation.service';
import ApiService from '../../services/api.service';
import FileService from '../../services/file.service';

const AddFollowUp = () => {
  const { rootId } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [rootConsultation, setRootConsultation] = useState(null);
  const [providerProfile, setProviderProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  const formTabs = [
    { id: 'general', label: 'General' },
    { id: 'history', label: 'History' },
    { id: 'physical', label: 'Physical' },
    { id: 'labResults', label: 'Lab Investigation' },
    { id: 'radiology', label: 'Imaging' },
    { id: 'management', label: 'Management' },
  ];

  const getInitialFormValues = () => ({
    general: {
      date: new Date().toISOString().split('T')[0],
      specialistName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      specialty: providerProfile?.specialty || rootConsultation?.general?.specialty || '',
      practiceName: providerProfile?.practiceInfo?.name || rootConsultation?.general?.practice || '',
      reasonForVisit: '',
      diagnosis: '',
      notes: '',
    },
    history: '',
    physicalExamination: '',
    management: '',
    vitals: {
      heartRate: '',
      bloodPressure: { systolic: '', diastolic: '' },
      bodyTemperature: '',
      respiratoryRate: '',
      haemoglobin: '',
      bloodGlucose: '',
      bloodGlucoseType: '',
      bloodOxygenSaturation: '',
      spo2Context: '',
      bmi: '',
      bodyFatPercentage: '',
      weight: '',
      height: '',
    },
    medication: { reason: '', startDate: '', endDate: '' },
    labResults: [],
    radiology: [],
    draftLabResult: { testName: '', labName: '', date: '', results: '', comments: '' },
    draftRadiologyReport: { scanType: '', date: '', bodyPart: '', findings: '', recommendations: '' },
    attachments: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rootResponse, profileResponse] = await Promise.allSettled([
          ApiService.get(`/consultations/${rootId}`),
          ApiService.get('/provider/profile'),
        ]);

        if (rootResponse.status === 'fulfilled' && rootResponse.value) {
          const root = rootResponse.value;
          // Guard: must be a root consultation and be open
          if (root.parentConsultation) {
            toast.error('Cannot add a follow-up to a follow-up consultation.');
            navigate(`/provider/consultations/${rootId}`);
            return;
          }
          if (root.caseStatus === 'closed') {
            toast.error('This case is closed. Reopen it before adding a follow-up.');
            navigate(`/provider/consultations/${rootId}`);
            return;
          }
          // Guard: only assigned provider
          if (root.provider?._id !== user?.id) {
            toast.error('Only the assigned provider can add follow-ups to this case.');
            navigate(`/provider/consultations/${rootId}`);
            return;
          }
          setRootConsultation(root);
        } else {
          toast.error('Failed to load consultation');
          navigate('/provider/consultations');
          return;
        }

        if (profileResponse.status === 'fulfilled' && profileResponse.value?.success) {
          setProviderProfile(profileResponse.value.provider?.providerProfile || null);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load consultation data');
        navigate('/provider/consultations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [rootId]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildPayload = (formData, status) => {
    const { date, ...generalWithoutDate } = formData.general;

    const transformedVitals = formData.vitals
      ? {
          heartRate: { value: formData.vitals.heartRate || '' },
          bloodPressure: formData.vitals.bloodPressure || { systolic: '', diastolic: '' },
          bodyTemperature: { value: formData.vitals.bodyTemperature || '' },
          respiratoryRate: { value: formData.vitals.respiratoryRate || '' },
          haemoglobin: { value: formData.vitals.haemoglobin || '' },
          bloodGlucose: {
            value: formData.vitals.bloodGlucose || '',
            ...(formData.vitals.bloodGlucoseType ? { measurementType: formData.vitals.bloodGlucoseType } : {}),
          },
          bloodOxygenSaturation: {
            value: formData.vitals.bloodOxygenSaturation || '',
            ...(formData.vitals.spo2Context ? { measurementContext: formData.vitals.spo2Context } : {}),
          },
          bmi: { value: formData.vitals.bmi || '' },
          bodyFatPercentage: { value: formData.vitals.bodyFatPercentage || '' },
          weight: { value: formData.vitals.weight || '' },
          height: { value: formData.vitals.height || '' },
        }
      : {};

    const medObj = formData.medication || {};
    const hasMedicationData = medObj.reason || medObj.startDate || medObj.endDate;
    const transformedMedication = hasMedicationData
      ? [{
          name: medObj.reason || '(see management plan)',
          reasonForPrescription: medObj.reason || '',
          ...(medObj.startDate ? { startDate: medObj.startDate } : {}),
          ...(medObj.endDate ? { endDate: medObj.endDate } : {}),
        }]
      : [];

    const labResultsToSubmit = [...formData.labResults];
    const labDraft = formData.draftLabResult;
    if (labDraft?.testName?.trim() && labDraft?.date && labDraft?.results?.trim()) {
      labResultsToSubmit.push(labDraft);
    }
    const transformedLabResults = labResultsToSubmit.map((lab) => ({
      testName: lab.testName,
      labName: lab.labName,
      dateOfTest: lab.date || lab.dateOfTest,
      results: lab.results,
      comments: lab.comments,
    }));

    const radiologyToSubmit = [...formData.radiology];
    const radiologyDraft = formData.draftRadiologyReport;
    if (radiologyDraft?.scanType && radiologyDraft?.date && radiologyDraft?.bodyPart?.trim() && radiologyDraft?.findings?.trim()) {
      radiologyToSubmit.push(radiologyDraft);
    }
    const transformedRadiology = radiologyToSubmit.map((rad) => ({
      typeOfScan: rad.scanType || rad.typeOfScan,
      date: rad.date,
      bodyPartExamined: rad.bodyPart || rad.bodyPartExamined,
      findings: rad.findings,
      recommendations: rad.recommendations,
    }));

    const payload = {
      date,
      general: { ...generalWithoutDate, practice: generalWithoutDate.practiceName },
      history: formData.history || '',
      physicalExamination: formData.physicalExamination || '',
      management: formData.management || '',
      vitals: transformedVitals,
      medication: transformedMedication,
      labResults: transformedLabResults,
      radiology: transformedRadiology,
      status,
      attachments: [],
    };
    delete payload.general.practiceName;
    return { payload, filesToUpload: formData.attachments || [] };
  };

  const submit = async (formData, status) => {
    setIsSaving(true);
    try {
      const { payload, filesToUpload } = buildPayload(formData, status);
      const response = await ConsultationService.addFollowUp(rootId, payload);

      if (response && (response._id || response.id)) {
        const followUpId = response._id || response.id;
        if (filesToUpload.length > 0) {
          try {
            for (const file of filesToUpload) {
              if (!(file instanceof File)) continue;
              await FileService.uploadConsultationFile(followUpId, file);
            }
            toast.success('Follow-up saved with attachments');
          } catch {
            toast.warning('Follow-up saved but some files failed to upload');
          }
        } else {
          toast.success(status === 'completed' ? 'Follow-up submitted successfully' : 'Follow-up draft saved');
        }
        navigate(`/provider/consultations/${rootId}`);
      }
    } catch (error) {
      const msg = error?.response?.data?.message;
      if (msg) {
        toast.error(msg);
      } else {
        toast.error('Failed to save follow-up. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async (formData) => {
    await submit(formData, 'draft');
  };

  const handleSubmit = async (formData) => {
    if (!formData.general?.reasonForVisit?.trim()) {
      toast.error('Reason for visit is required for completed consultations.');
      setActiveTab('general');
      return;
    }
    if (!formData.general?.specialistName?.trim()) {
      toast.error('Specialist name is required.');
      setActiveTab('general');
      return;
    }
    if (!formData.general?.specialty?.trim()) {
      toast.error('Specialty is required.');
      setActiveTab('general');
      return;
    }
    await submit(formData, 'completed');
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
        <p>Loading...</p>
      </div>
    );
  }

  const patient = rootConsultation?.patient;
  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : 'Unknown Patient';

  return (
    <div className={styles.addConsultationContainer}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Link to={`/provider/consultations/${rootId}`} className={styles.backLink}>
            &larr; Back to Thread
          </Link>
          <h1>Add Follow-Up</h1>
          <p>Adding a follow-up for <strong>{patientName}</strong></p>
        </div>
      </div>

      {patient && (
        <div className={styles.patientInfo}>
          <div className={styles.patientDetails}>
            <h2>{patientName}</h2>
            <div className={styles.patientMetadata}>
              <span>Email: {patient.email || 'N/A'}</span>
              <span>Gender: {patient.patientProfile?.gender || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      <Card className={styles.formCard}>
        <Tabs tabs={formTabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <div className={styles.formContent}>
          <ConsultationForm
            activeTab={activeTab}
            initialValues={getInitialFormValues()}
            onSubmit={handleSubmit}
            onSaveDraft={handleSaveDraft}
            isSaving={isSaving}
            isEditing={false}
          />
        </div>
      </Card>
    </div>
  );
};

export default AddFollowUp;
