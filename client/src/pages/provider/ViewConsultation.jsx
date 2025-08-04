import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './ViewConsultation.module.css';
import ApiService from '../../services/api.service';
import FileService from '../../services/file.service';

// Component imports
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Tabs from '../../components/common/Tabs';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import FileViewer from '../../components/common/FileViewer';

const ViewConsultation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [consultation, setConsultation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  // Define the tabs structure matching the consultation form
  const consultationTabs = [
    { id: 'general', label: 'General' },
    { id: 'vitals', label: 'Vitals' },
    { id: 'medication', label: 'Medication' },
    { id: 'immunization', label: 'Immunization' },
    { id: 'labResults', label: 'Lab Results' },
    { id: 'radiology', label: 'Radiology' },
    { id: 'hospital', label: 'Hospital' },
    { id: 'surgery', label: 'Surgery' }
  ];

  useEffect(() => {
    fetchConsultationData();
    
    // Check for tab parameter in URL
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && consultationTabs.some(tab => tab.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [id, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchConsultationData = async () => {
    try {
      const response = await ApiService.get(`/consultations/${id}`);
      if (response) {
        setConsultation(response);
      }
    } catch (error) {
      console.error('Error fetching consultation:', error);
      toast.error('Failed to load consultation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
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
      // Refresh consultation data to update attachments list
      fetchConsultationData();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatValue = (value, unit = '') => {
    if (!value || value === '' || value === 'N/A') return 'N/A';
    return `${value}${unit ? ` ${unit}` : ''}`;
  };

  // Render content for each tab
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
                <label>Status:</label>
                <span className={styles[`status-${consultation.status}`]}>
                  {consultation.status || 'Unknown'}
                </span>
              </div>
            </div>
            
            {consultation.general?.notes && (
              <div className={styles.notesField}>
                <label>Notes/Observations:</label>
                <div className={styles.notesContent}>
                  {consultation.general.notes}
                </div>
              </div>
            )}
          </div>
        );

      case 'vitals':
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
              <div className={styles.field}>
                <label>Blood Glucose:</label>
                <span>{formatValue(vitals.bloodGlucose?.value, 'mg/dL')}</span>
              </div>
              <div className={styles.field}>
                <label>Blood Oxygen Saturation:</label>
                <span>{formatValue(vitals.bloodOxygenSaturation?.value, '%')}</span>
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
          </div>
        );

      case 'medication':
        const medications = consultation.medications || [];
        return (
          <div className={styles.tabContent}>
            {medications.length === 0 ? (
              <div className={styles.emptyState}>No medications recorded</div>
            ) : (
              <div className={styles.recordsList}>
                {medications.map((medication, index) => (
                  <div key={index} className={styles.recordItem}>
                    <div className={styles.recordHeader}>
                      <h4>{medication.name || 'Unnamed Medication'}</h4>
                    </div>
                    <div className={styles.recordDetails}>
                      <div className={styles.field}>
                        <label>Dosage:</label>
                        <span>{medication.dosage ? `${medication.dosage.value} ${medication.dosage.unit}` : 'N/A'}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Frequency:</label>
                        <span>{formatValue(medication.frequency)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Reason for Prescription:</label>
                        <span>{formatValue(medication.reasonForPrescription)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Start Date:</label>
                        <span>{formatDate(medication.startDate)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>End Date:</label>
                        <span>{formatDate(medication.endDate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'immunization':
        const immunizations = consultation.immunizations || [];
        return (
          <div className={styles.tabContent}>
            {immunizations.length === 0 ? (
              <div className={styles.emptyState}>No immunizations recorded</div>
            ) : (
              <div className={styles.recordsList}>
                {immunizations.map((immunization, index) => (
                  <div key={index} className={styles.recordItem}>
                    <div className={styles.recordHeader}>
                      <h4>{immunization.vaccineName || 'Unnamed Vaccine'}</h4>
                    </div>
                    <div className={styles.recordDetails}>
                      <div className={styles.field}>
                        <label>Date Administered:</label>
                        <span>{formatDate(immunization.dateAdministered)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Vaccine Serial Number:</label>
                        <span>{formatValue(immunization.vaccineSerialNumber)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Next Due Date:</label>
                        <span>{formatDate(immunization.nextDueDate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'labResults':
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
                      <div className={styles.field}>
                        <label>Lab Name:</label>
                        <span>{formatValue(lab.labName)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Date of Test:</label>
                        <span>{formatDate(lab.dateOfTest)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Results:</label>
                        <span>{formatValue(lab.results)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Comments:</label>
                        <span>{formatValue(lab.comments)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'radiology':
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
                      <div className={styles.field}>
                        <label>Date:</label>
                        <span>{formatDate(radiology.date)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Body Part Examined:</label>
                        <span>{formatValue(radiology.bodyPartExamined)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Findings:</label>
                        <span>{formatValue(radiology.findings)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Recommendations:</label>
                        <span>{formatValue(radiology.recommendations)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'hospital':
        const hospitalRecords = consultation.hospitalRecords || [];
        return (
          <div className={styles.tabContent}>
            {hospitalRecords.length === 0 ? (
              <div className={styles.emptyState}>No hospital records</div>
            ) : (
              <div className={styles.recordsList}>
                {hospitalRecords.map((hospital, index) => (
                  <div key={index} className={styles.recordItem}>
                    <div className={styles.recordHeader}>
                      <h4>{hospital.hospitalName || 'Hospital Stay'}</h4>
                    </div>
                    <div className={styles.recordDetails}>
                      <div className={styles.field}>
                        <label>Hospital Name:</label>
                        <span>{formatValue(hospital.hospitalName)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Admission Date:</label>
                        <span>{formatDate(hospital.admissionDate)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Discharge Date:</label>
                        <span>{formatDate(hospital.dischargeDate)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Reason for Hospitalization:</label>
                        <span>{formatValue(hospital.reasonForHospitalization)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Treatments Received:</label>
                        <span>
                          {hospital.treatmentsReceived && hospital.treatmentsReceived.length > 0 
                            ? hospital.treatmentsReceived.join(', ') 
                            : 'N/A'}
                        </span>
                      </div>
                      <div className={styles.field}>
                        <label>Attending Doctors:</label>
                        <span>
                          {hospital.attendingDoctors && hospital.attendingDoctors.length > 0 
                            ? hospital.attendingDoctors.map(doc => doc.name || doc).join(', ')
                            : 'N/A'}
                        </span>
                      </div>
                      <div className={styles.field}>
                        <label>Discharge Summary:</label>
                        <span>{formatValue(hospital.dischargeSummary)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Investigations Done:</label>
                        <span>
                          {hospital.investigationsDone && hospital.investigationsDone.length > 0 
                            ? hospital.investigationsDone.join(', ') 
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'surgery':
        const surgeryRecords = consultation.surgeryRecords || [];
        return (
          <div className={styles.tabContent}>
            {surgeryRecords.length === 0 ? (
              <div className={styles.emptyState}>No surgery records</div>
            ) : (
              <div className={styles.recordsList}>
                {surgeryRecords.map((surgery, index) => (
                  <div key={index} className={styles.recordItem}>
                    <div className={styles.recordHeader}>
                      <h4>{surgery.typeOfSurgery || 'Unnamed Surgery'}</h4>
                    </div>
                    <div className={styles.recordDetails}>
                      <div className={styles.field}>
                        <label>Date:</label>
                        <span>{formatDate(surgery.date)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Reason:</label>
                        <span>{formatValue(surgery.reason)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Complications:</label>
                        <span>{formatValue(surgery.complications)}</span>
                      </div>
                      <div className={styles.field}>
                        <label>Recovery Notes:</label>
                        <span>{formatValue(surgery.recoveryNotes)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

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
        <Link to="/provider/consultations">
          <Button>Back to Consultations</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.viewContainer}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Link to="/provider/consultations" className={styles.backLink}>
            &larr; Back to Consultations
          </Link>
          <h1>View Consultation</h1>
          <p>Consultation details for {consultation.patient?.firstName} {consultation.patient?.lastName}</p>
        </div>
        
        <div className={styles.headerActions}>
          <Button onClick={handleEdit} variant="primary">
            Edit Consultation
          </Button>
        </div>
      </div>

      {/* Patient Information Bar */}
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
              <span>Age: {consultation.patient.patientProfile?.dateOfBirth ? 
                (() => {
                  const today = new Date();
                  const birthDate = new Date(consultation.patient.patientProfile.dateOfBirth);
                  let age = today.getFullYear() - birthDate.getFullYear();
                  const monthDiff = today.getMonth() - birthDate.getMonth();
                  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                  }
                  return age;
                })() : 'N/A'}</span>
              <span>Insurance: {consultation.patient.patientProfile?.insurance?.provider || 'N/A'}</span>
              <span>Status: <span className={styles[`status-${consultation.status}`]}>{consultation.status}</span></span>
            </div>
          </div>
        </div>
      )}

      <Card className={styles.consultationCard}>
        <Tabs 
          tabs={consultationTabs} 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
        />
        
        <div className={styles.tabContentWrapper}>
          {renderTabContent()}
        </div>

        {/* Attachments section */}
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
              canDelete={consultation.status === 'draft'} // Only allow deletion for draft consultations
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

export default ViewConsultation; 