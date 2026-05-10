import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './ViewConsultationFull.module.css';
import ApiService from '../../services/api.service';
import FileService from '../../services/file.service';
import { exportAsJSON, exportAsCSV } from '../../utils/consultationExport';
import { formatDate } from '../../utils/dateUtils';

import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Tabs from '../../components/common/Tabs';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const consultationTabs = [
  { id: 'general', label: 'General' },
  { id: 'history', label: 'History' },
  { id: 'physical', label: 'Physical' },
  { id: 'labResults', label: 'Lab Investigation' },
  { id: 'radiology', label: 'Imaging' },
  { id: 'management', label: 'Management' },
  { id: 'files', label: 'Files' },
];

const PatientViewConsultationFull = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [consultation, setConsultation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && consultationTabs.some(t => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
    fetchConsultationData();
  }, [id, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchConsultationData = async () => {
    try {
      setIsLoading(true);
      const searchParams = new URLSearchParams(location.search);
      const followUpId = searchParams.get('followUpId');

      const response = await ApiService.get(`/consultations/${id}`);
      if (response) {
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownload = (format) => {
    if (!consultation) return;
    try {
      if (format === 'json') exportAsJSON(consultation);
      else if (format === 'csv') exportAsCSV(consultation);
      setShowDownloadMenu(false);
    } catch (error) {
      console.error('Error exporting consultation:', error);
    }
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
      FileService.downloadFile('consultations', file.filename, file.originalName || file.filename);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
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
                <label>Date</label>
                <span>{formatDate(consultation.date || consultation.createdAt)}</span>
              </div>
              <div className={styles.field}>
                <label>Specialist</label>
                <span>{consultation.general?.specialistName || (consultation.provider ? `Dr. ${consultation.provider.firstName} ${consultation.provider.lastName}` : 'N/A')}</span>
              </div>
              <div className={styles.field}>
                <label>Specialty</label>
                <span>{consultation.general?.specialty || 'N/A'}</span>
              </div>
              <div className={styles.field}>
                <label>Practice</label>
                <span>{consultation.general?.practice || 'N/A'}</span>
              </div>
              <div className={styles.field}>
                <label>Reason for Visit</label>
                <span>{consultation.general?.reasonForVisit || 'N/A'}</span>
              </div>
              <div className={styles.field}>
                <label>Diagnosis</label>
                <span>{consultation.general?.diagnosis || 'N/A'}</span>
              </div>
            </div>
            {(consultation.general?.observations || consultation.general?.notes) && (
              <div className={styles.notesField}>
                <label>Notes / Observations</label>
                <div className={styles.notesContent}>
                  {consultation.general?.observations || consultation.general?.notes}
                </div>
              </div>
            )}
          </div>
        );

      case 'history':
        return (
          <div className={styles.tabContent}>
            {consultation.history ? (
              <div className={styles.notesField}>
                <label>Patient History</label>
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
            {Object.keys(vitals).length === 0 ? (
              <div className={styles.emptyState}>No vitals recorded for this consultation</div>
            ) : (
              <div className={styles.fieldGrid}>
                <div className={styles.field}><label>Heart Rate</label><span>{formatValue(vitals.heartRate?.value, 'bpm')}</span></div>
                <div className={styles.field}>
                  <label>Blood Pressure</label>
                  <span>{vitals.bloodPressure?.systolic && vitals.bloodPressure?.diastolic ? `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic} mmHg` : 'N/A'}</span>
                </div>
                <div className={styles.field}><label>Body Temperature</label><span>{formatValue(vitals.bodyTemperature?.value, '°C')}</span></div>
                <div className={styles.field}><label>Respiratory Rate</label><span>{formatValue(vitals.respiratoryRate?.value, '/min')}</span></div>
                {vitals.haemoglobin?.value != null && (
                  <div className={styles.field}><label>Haemoglobin</label><span>{formatValue(vitals.haemoglobin.value, 'g/dL')}</span></div>
                )}
                <div className={styles.field}>
                  <label>Blood Glucose</label>
                  <span>
                    {formatValue(vitals.bloodGlucose?.value, 'mmol/L')}
                    {vitals.bloodGlucose?.measurementType ? ` (${bloodGlucoseTypeLabels[vitals.bloodGlucose.measurementType] || vitals.bloodGlucose.measurementType})` : ''}
                  </span>
                </div>
                <div className={styles.field}>
                  <label>Blood Oxygen Saturation</label>
                  <span>
                    {formatValue(vitals.bloodOxygenSaturation?.value, '%')}
                    {vitals.bloodOxygenSaturation?.measurementContext ? ` (${spo2ContextLabels[vitals.bloodOxygenSaturation.measurementContext] || vitals.bloodOxygenSaturation.measurementContext})` : ''}
                  </span>
                </div>
                <div className={styles.field}><label>BMI</label><span>{formatValue(vitals.bmi?.value)}</span></div>
                <div className={styles.field}><label>Weight</label><span>{formatValue(vitals.weight?.value, 'kg')}</span></div>
                <div className={styles.field}><label>Height</label><span>{formatValue(vitals.height?.value, 'cm')}</span></div>
              </div>
            )}
            {consultation.physicalExamination && (
              <div className={styles.notesField}>
                <label>Physical Examination</label>
                <div className={styles.notesContent} style={{ whiteSpace: 'pre-wrap' }}>{consultation.physicalExamination}</div>
              </div>
            )}
          </div>
        );
      }

      case 'labResults': {
        const labResults = consultation.labResults || [];
        return (
          <div className={styles.tabContent}>
            {labResults.length === 0 ? (
              <div className={styles.emptyState}>No lab results recorded for this consultation</div>
            ) : (
              <div className={styles.recordsList}>
                {labResults.map((lab, idx) => (
                  <div key={idx} className={styles.recordItem}>
                    <div className={styles.recordHeader}><h4>{lab.testName || 'Unnamed Test'}</h4></div>
                    <div className={styles.recordDetails}>
                      <div className={styles.field}><label>Lab Name</label><span>{formatValue(lab.labName)}</span></div>
                      <div className={styles.field}><label>Date of Test</label><span>{formatDate(lab.dateOfTest)}</span></div>
                      <div className={styles.field}><label>Results</label><span>{formatValue(lab.results)}</span></div>
                      <div className={styles.field}><label>Comments</label><span>{formatValue(lab.comments || lab.commentsOrDiagnosis)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'radiology': {
        const reports = consultation.radiologyReports || [];
        return (
          <div className={styles.tabContent}>
            {reports.length === 0 ? (
              <div className={styles.emptyState}>No radiology reports recorded for this consultation</div>
            ) : (
              <div className={styles.recordsList}>
                {reports.map((report, idx) => (
                  <div key={idx} className={styles.recordItem}>
                    <div className={styles.recordHeader}><h4>{report.typeOfScan || 'Unnamed Scan'}</h4></div>
                    <div className={styles.recordDetails}>
                      <div className={styles.field}><label>Date</label><span>{formatDate(report.date)}</span></div>
                      <div className={styles.field}><label>Body Part Examined</label><span>{formatValue(report.bodyPartExamined)}</span></div>
                      <div className={styles.field}><label>Findings</label><span>{formatValue(report.findings)}</span></div>
                      <div className={styles.field}><label>Recommendations</label><span>{formatValue(report.recommendations)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'management':
        return (
          <div className={styles.tabContent}>
            {consultation.management ? (
              <div className={styles.notesField}>
                <label>Management Plan</label>
                <div className={styles.notesContent} style={{ whiteSpace: 'pre-wrap' }}>{consultation.management}</div>
              </div>
            ) : (
              <div className={styles.emptyState}>No management plan recorded</div>
            )}
          </div>
        );

      case 'files': {
        const attachments = consultation.attachments || [];
        return (
          <div className={styles.tabContent}>
            {attachments.length === 0 ? (
              <div className={styles.emptyState}>No files attached to this consultation</div>
            ) : (
              <div className={styles.recordsList}>
                {attachments.map((file) => {
                  const canPreview = file.mimetype && (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf');
                  return (
                    <div key={file._id || file.id} className={styles.recordItem} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div className={styles.recordHeader} style={{ border: 'none', marginBottom: 4, paddingBottom: 0 }}>
                          <h4>{file.originalName || file.filename}</h4>
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                          {file.mimetype || 'Unknown'} · {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown size'} · Uploaded {formatDate(file.uploadDate)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {canPreview && (
                          <Button variant="tertiary" size="small" onClick={() => handleFileView(file)}>View</Button>
                        )}
                        <Button variant="tertiary" size="small" onClick={() => handleFileDownload(file)}>Download</Button>
                      </div>
                    </div>
                  );
                })}
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
        <Link to="/patient/consultations"><Button>Back to Consultations</Button></Link>
      </div>
    );
  }

  return (
    <div className={styles.viewContainer}>
      <Link to={`/patient/consultations/${id}`} className={styles.backLink}>
        ← Back to Thread
      </Link>

      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Consultation Details</h1>
          <p>
            {formatDate(consultation.date || consultation.createdAt)}
            {consultation.provider ? ` · Dr. ${consultation.provider.firstName} ${consultation.provider.lastName}` : ''}
          </p>
        </div>

        <div className={styles.headerActions} ref={downloadMenuRef} style={{ position: 'relative' }}>
          <Button onClick={() => setShowDownloadMenu(v => !v)} disabled={!consultation}>
            Download ▼
          </Button>
          {showDownloadMenu && (
            <div className={styles.downloadMenu}>
              <button className={styles.downloadOption} onClick={() => handleDownload('csv')}>Download as CSV</button>
              <button className={styles.downloadOption} onClick={() => handleDownload('json')}>Download as JSON</button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.consultationCard}>
        <Tabs tabs={consultationTabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <div className={styles.tabContentWrapper}>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default PatientViewConsultationFull;
