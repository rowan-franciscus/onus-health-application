import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './ViewConsultation.module.css';
import ApiService from '../../services/api.service';
import FileService from '../../services/file.service';
import { formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Tabs from '../../components/common/Tabs';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import FileViewer from '../../components/common/FileViewer';

const ViewConsultationFull = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [consultation, setConsultation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  const consultationTabs = [
    { id: 'general', label: 'General' },
    { id: 'history', label: 'History' },
    { id: 'physical', label: 'Physical' },
    { id: 'labResults', label: 'Lab Investigation' },
    { id: 'radiology', label: 'Imaging' },
    { id: 'management', label: 'Management' }
  ];

  useEffect(() => {
    fetchConsultationData();
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && consultationTabs.some(tab => tab.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [id, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchConsultationData = async () => {
    try {
      // If the id corresponds to a follow-up in a thread, the API returns the root
      // with thread array. We need the specific entry — check query param or path.
      // For simplicity, accept ?followUpId=<id> or use the id directly.
      const searchParams = new URLSearchParams(location.search);
      const followUpId = searchParams.get('followUpId');
      const targetId = followUpId || id;

      // Always fetch through the root endpoint (which resolves to root + thread)
      const response = await ApiService.get(`/consultations/${targetId}`);
      if (response) {
        // If followUpId was given, find that entry in the thread
        if (followUpId) {
          const followUp = response.thread?.find(f => f._id === followUpId);
          setConsultation(followUp || response);
        } else {
          setConsultation(response);
        }
      }
    } catch (error) {
      console.error('Error fetching consultation:', error);
      toast.error('Failed to load consultation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/provider/consultations/${id}/edit`);
  };

  const handleFileView = (file) => {
    try {
      FileService.viewFile('consultations', file.filename);
    } catch (error) {
      console.error('Error viewing file:', error);
      toast.error('Failed to view file');
    }
  };

  const handleFileDownload = (file) => {
    try {
      FileService.downloadFile('consultations', file.filename, file.originalName);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleFileDelete = async (file) => {
    try {
      await FileService.deleteConsultationAttachment(id, file.id);
      toast.success('File deleted successfully');
      fetchConsultationData();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const formatValue = (value, unit = '') => {
    if (!value || value === '' || value === 'N/A') return 'N/A';
    return `${value}${unit ? ` ${unit}` : ''}`;
  };

  const bloodGlucoseTypeLabels = {
    random: 'Random / Casual',
    fasting: 'Fasting',
    'post-prandial': 'Post-Prandial',
    postprandial: 'Post-Prandial',
    rapid: 'Rapid / Point-of-Care',
  };

  const spo2ContextLabels = {
    'room-air': 'Room Air',
    'nasal-cannula': 'Nasal Cannula',
    'face-mask': 'Face Mask',
    ventilator: 'Ventilator',
  };

  const renderTabContent = () => {
    if (!consultation) return null;

    switch (activeTab) {
      case 'general':
        return (
          <div className={styles.tabContent}>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label>Date:</label>
                <span>{formatDate(consultation.date)}</span>
              </div>
              <div className={styles.field}>
                <label>Specialist Name:</label>
                <span>{formatValue(consultation.general?.specialistName)}</span>
              </div>
              <div className={styles.field}>
                <label>Specialty:</label>
                <span>{formatValue(consultation.general?.specialty)}</span>
              </div>
              <div className={styles.field}>
                <label>Practice Name:</label>
                <span>{formatValue(consultation.general?.practice)}</span>
              </div>
              <div className={styles.field}>
                <label>Reason for Visit:</label>
                <span>{formatValue(consultation.general?.reasonForVisit)}</span>
              </div>
              <div className={styles.field}>
                <label>Diagnosis:</label>
                <span>{formatValue(consultation.general?.diagnosis)}</span>
              </div>
              <div className={styles.field}>
                <label>Status:</label>
                <span className={styles[`status-${consultation.status}`]}>
                  {consultation.status || 'Unknown'}
                </span>
              </div>
            </div>
            {consultation.general?.notes && (
              <div className={styles.notesField}>
                <label>Notes/Observations:</label>
                <div className={styles.notesContent}>{consultation.general.notes}</div>
              </div>
            )}
          </div>
        );

      case 'history':
        return (
          <div className={styles.tabContent}>
            {consultation.history ? (
              <div className={styles.notesField}>
                <label>Patient History:</label>
                <div className={styles.notesContent} style={{ whiteSpace: 'pre-wrap' }}>
                  {consultation.history}
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>No patient history recorded</div>
            )}
          </div>
        );

      case 'physical': {
        const vitals = consultation.vitals || {};
        return (
          <div className={styles.tabContent}>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label>Heart Rate:</label>
                <span>{formatValue(vitals.heartRate?.value, 'bpm')}</span>
              </div>
              <div className={styles.field}>
                <label>Blood Pressure:</label>
                <span>
                  {vitals.bloodPressure?.systolic && vitals.bloodPressure?.diastolic
                    ? `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic} mmHg`
                    : 'N/A'}
                </span>
              </div>
              <div className={styles.field}>
                <label>Body Temperature:</label>
                <span>{formatValue(vitals.bodyTemperature?.value, '°C')}</span>
              </div>
              <div className={styles.field}>
                <label>Respiratory Rate:</label>
                <span>{formatValue(vitals.respiratoryRate?.value, '/min')}</span>
              </div>
              {vitals.haemoglobin?.value != null && (
                <div className={styles.field}>
                  <label>Haemoglobin:</label>
                  <span>{formatValue(vitals.haemoglobin.value, 'g/dL')}</span>
                </div>
              )}
              <div className={styles.field}>
                <label>Blood Glucose:</label>
                <span>
                  {formatValue(vitals.bloodGlucose?.value, 'mmol/L')}
                  {vitals.bloodGlucose?.measurementType
                    ? ` (${bloodGlucoseTypeLabels[vitals.bloodGlucose.measurementType] || vitals.bloodGlucose.measurementType})`
                    : ''}
                </span>
              </div>
              <div className={styles.field}>
                <label>Blood Oxygen Saturation:</label>
                <span>
                  {formatValue(vitals.bloodOxygenSaturation?.value, '%')}
                  {vitals.bloodOxygenSaturation?.measurementContext
                    ? ` (${spo2ContextLabels[vitals.bloodOxygenSaturation.measurementContext] || vitals.bloodOxygenSaturation.measurementContext})`
                    : ''}
                </span>
              </div>
              <div className={styles.field}>
                <label>BMI:</label>
                <span>{formatValue(vitals.bmi?.value)}</span>
              </div>
              <div className={styles.field}>
                <label>Body Fat Percentage:</label>
                <span>{formatValue(vitals.bodyFatPercentage?.value, '%')}</span>
              </div>
              <div className={styles.field}>
                <label>Weight:</label>
                <span>{formatValue(vitals.weight?.value, 'kg')}</span>
              </div>
              <div className={styles.field}>
                <label>Height:</label>
                <span>{formatValue(vitals.height?.value, 'cm')}</span>
              </div>
            </div>
            {consultation.physicalExamination && (
              <div className={styles.notesField}>
                <label>Physical Examination:</label>
                <div className={styles.notesContent} style={{ whiteSpace: 'pre-wrap' }}>
                  {consultation.physicalExamination}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'management': {
        const firstMed = (consultation.medications && consultation.medications[0]) || {};
        return (
          <div className={styles.tabContent}>
            {consultation.management ? (
              <div className={styles.notesField}>
                <label>Medications:</label>
                <div className={styles.notesContent} style={{ whiteSpace: 'pre-wrap' }}>
                  {consultation.management}
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>No management plan recorded</div>
            )}
            <div className={styles.fieldGrid} style={{ marginTop: 16 }}>
              <div className={styles.field}>
                <label>Reason for Prescription:</label>
                <span>{formatValue(firstMed.reasonForPrescription)}</span>
              </div>
              <div className={styles.field}>
                <label>Start Date:</label>
                <span>{formatDate(firstMed.startDate)}</span>
              </div>
              <div className={styles.field}>
                <label>End Date:</label>
                <span>{formatDate(firstMed.endDate)}</span>
              </div>
            </div>
          </div>
        );
      }

      case 'labResults': {
        const labResults = consultation.labResults || [];
        return (
          <div className={styles.tabContent}>
            {labResults.length === 0 ? (
              <div className={styles.emptyState}>No lab results recorded</div>
            ) : (
              <div className={styles.recordsList}>
                {labResults.map((lab, index) => (
                  <div key={index} className={styles.recordItem}>
                    <div className={styles.recordHeader}>
                      <h4>{lab.testName || 'Unnamed Test'}</h4>
                    </div>
                    <div className={styles.recordDetails}>
                      <div className={styles.field}><label>Lab Name:</label><span>{formatValue(lab.labName)}</span></div>
                      <div className={styles.field}><label>Date of Test:</label><span>{formatDate(lab.dateOfTest)}</span></div>
                      <div className={styles.field}><label>Results:</label><span>{formatValue(lab.results)}</span></div>
                      <div className={styles.field}><label>Comments:</label><span>{formatValue(lab.comments)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'radiology': {
        const radiologyReports = consultation.radiologyReports || [];
        return (
          <div className={styles.tabContent}>
            {radiologyReports.length === 0 ? (
              <div className={styles.emptyState}>No radiology reports recorded</div>
            ) : (
              <div className={styles.recordsList}>
                {radiologyReports.map((radiology, index) => (
                  <div key={index} className={styles.recordItem}>
                    <div className={styles.recordHeader}>
                      <h4>{radiology.typeOfScan || 'Unnamed Scan'}</h4>
                    </div>
                    <div className={styles.recordDetails}>
                      <div className={styles.field}><label>Date:</label><span>{formatDate(radiology.date)}</span></div>
                      <div className={styles.field}><label>Body Part Examined:</label><span>{formatValue(radiology.bodyPartExamined)}</span></div>
                      <div className={styles.field}><label>Findings:</label><span>{formatValue(radiology.findings)}</span></div>
                      <div className={styles.field}><label>Recommendations:</label><span>{formatValue(radiology.recommendations)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
        <p>Loading consultation...</p>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className={styles.errorContainer}>
        <h2>Consultation Not Found</h2>
        <p>The consultation you're looking for could not be found.</p>
        <Link to={`/provider/consultations/${id}`}>
          <Button>Back to Thread</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.viewContainer}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Link to={`/provider/consultations/${id}`} className={styles.backLink}>
            &larr; Back to Thread
          </Link>
          <h1>Full Consultation Details</h1>
          <p>
            {consultation.parentConsultation ? 'Follow-up' : 'Initial Consultation'} for{' '}
            {consultation.patient?.firstName} {consultation.patient?.lastName}
          </p>
        </div>
        {consultation.provider?._id === user?.id && (
          <div className={styles.headerActions}>
            <Button onClick={handleEdit} variant="primary">
              Edit Consultation
            </Button>
          </div>
        )}
      </div>

      {consultation.patient && (
        <div className={styles.patientInfo}>
          <div className={styles.patientAvatar}>
            {consultation.patient.profileImage ? (
              <img
                src={FileService.getProfilePictureUrl(consultation.patient.profileImage, consultation.patient._id)}
                alt={`${consultation.patient.firstName} ${consultation.patient.lastName}`}
                className={styles.patientAvatarImage}
              />
            ) : (
              <div className={styles.patientAvatarPlaceholder}>
                <svg className={styles.avatarIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 14C16 12.8954 14.6569 12 13 12H11C9.34315 12 8 12.8954 8 14V18C8 19.1046 8.89543 20 10 20H14C15.1046 20 16 19.1046 16 18V14Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
            )}
          </div>
          <div className={styles.patientDetails}>
            <h2>{consultation.patient.firstName} {consultation.patient.lastName}</h2>
            <div className={styles.patientMetadata}>
              <span>Email: {consultation.patient.email || 'N/A'}</span>
              <span>Gender: {consultation.patient.patientProfile?.gender || 'N/A'}</span>
              <span>Insurance: {consultation.patient.patientProfile?.insurance?.provider || 'N/A'}</span>
              <span>Status: <span className={styles[`status-${consultation.status}`]}>{consultation.status}</span></span>
            </div>
          </div>
        </div>
      )}

      <Card className={styles.consultationCard}>
        <Tabs tabs={consultationTabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <div className={styles.tabContentWrapper}>
          {renderTabContent()}
        </div>

        {consultation.attachments && consultation.attachments.length > 0 && (
          <div className={styles.attachmentsSection}>
            <h3>Consultation Documents</h3>
            <FileViewer
              files={consultation.attachments.map((attachment, index) => ({
                id: attachment._id || index.toString(),
                filename: attachment.filename || attachment.originalName || `file_${index}`,
                originalName: attachment.originalName || attachment.filename || `file_${index}`,
                size: attachment.size || 0,
                mimetype: attachment.mimetype || attachment.type || 'application/octet-stream',
                uploadDate: attachment.uploadDate || consultation.createdAt,
                path: attachment.path
              }))}
              onView={handleFileView}
              onDownload={handleFileDownload}
              onDelete={handleFileDelete}
              canDelete={consultation.status === 'draft'}
              showActions={true}
              emptyMessage="No documents attached"
              className={styles.fileViewer}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default ViewConsultationFull;
