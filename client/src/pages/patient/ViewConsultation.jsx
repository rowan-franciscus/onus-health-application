import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import styles from './ViewConsultation.module.css';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Tabs from '../../components/common/Tabs';
import ApiService from '../../services/api.service';
import FileService from '../../services/file.service';
import { exportAsJSON, exportAsCSV } from '../../utils/consultationExport';
import { formatDate } from '../../utils/dateUtils';

// Define tabs array outside component
const tabs = [
  { id: 'general', label: 'General' },
  { id: 'history', label: 'History' },
  { id: 'physical', label: 'Physical' },
  { id: 'labResults', label: 'Lab Investigation' },
  { id: 'radiologyReports', label: 'Imaging' },
  { id: 'management', label: 'Management' },
  { id: 'files', label: 'Files' },
];

const PatientViewConsultation = () => {
  const { id } = useParams();
  const location = useLocation();
  const [consultation, setConsultation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [error, setError] = useState(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);

  useEffect(() => {
    // Check for tab parameter in URL
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && tabs.find(tab => tab.id === tabParam)) {
      setActiveTab(tabParam);
    }

    // Fetch actual consultation details from API
    const fetchConsultationDetails = async () => {
      try {
        setIsLoading(true);
        const consultationData = await ApiService.get(`/consultations/${id}`);
        
        if (consultationData) {
          // Transform the data to match our component's expected format
          const formattedConsultation = {
            id: consultationData._id,
            date: formatDate(consultationData.date || consultationData.createdAt),
            type: consultationData.general?.specialty || 'General',
            specialist: consultationData.general?.specialistName || 
                       (consultationData.provider ? 
                         `${consultationData.provider.firstName} ${consultationData.provider.lastName}` : 'Unknown'),
            specialty: consultationData.general?.specialty || 'General Medicine',
            clinic: consultationData.general?.practice || 'N/A',
            reason: consultationData.general?.reasonForVisit || 'N/A',
            notes: consultationData.general?.observations || consultationData.general?.notes || 'No notes available',
            
            // Different medical record types
            general: {
              date: consultationData.date || consultationData.createdAt,
              specialistName: consultationData.general?.specialistName || 'N/A',
              specialty: consultationData.general?.specialty || 'N/A',
              practice: consultationData.general?.practice || 'N/A',
              reasonForVisit: consultationData.general?.reasonForVisit || 'N/A',
              diagnosis: consultationData.general?.diagnosis || '',
              observations: consultationData.general?.observations || consultationData.general?.notes || 'No observations recorded',
            },

            history: consultationData.history || '',
            physicalExamination: consultationData.physicalExamination || '',
            management: consultationData.management || '',

            vitals: consultationData.vitals || {},
            medications: consultationData.medications || [],
            labResults: consultationData.labResults || [],
            radiologyReports: consultationData.radiologyReports || [],
            
            // File attachments
            attachments: consultationData.attachments || []
          };
          
          setConsultation(formattedConsultation);
        } else {
          setError('No consultation data received');
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch consultation:', error);
        setError(error.userMessage || error.message || 'Failed to load consultation details');
        setIsLoading(false);
      }
    };

    fetchConsultationDetails();
  }, [id, location.search]);

  // Handle tab switching
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };


  // Format value helper
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

  // Handle click outside download menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toggle download menu
  const toggleDownloadMenu = () => {
    setShowDownloadMenu(prev => !prev);
  };

  // Handle download by format
  const handleDownload = (format) => {
    if (!consultation) return;
    
    try {
      switch (format) {
        case 'json':
          exportAsJSON(consultation);
          break;
        case 'csv':
          exportAsCSV(consultation);
          break;
        default:
          console.error('Unknown format:', format);
      }
      setShowDownloadMenu(false);
    } catch (error) {
      console.error('Error exporting consultation:', error);
      // You could show a toast error here if needed
    }
  };

  // Handle file download
  const handleFileDownload = (file) => {
    try {
      FileService.downloadFile('consultations', file.filename, file.originalName || file.filename);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  // Handle file view
  const handleFileView = (file) => {
    try {
      FileService.viewFile('consultations', file.filename);
    } catch (error) {
      console.error('Error viewing file:', error);
    }
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    if (!consultation) return null;

    switch (activeTab) {
      case 'general':
        return (
          <div className={styles.generalInfo}>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <h3>Date</h3>
                <p>{formatDate(consultation.general.date)}</p>
              </div>
              <div className={styles.infoItem}>
                <h3>Specialist</h3>
                <p>{consultation.general.specialistName}</p>
              </div>
              <div className={styles.infoItem}>
                <h3>Specialty</h3>
                <p>{consultation.general.specialty}</p>
              </div>
              <div className={styles.infoItem}>
                <h3>Practice</h3>
                <p>{consultation.general.practice}</p>
              </div>
              <div className={styles.infoItem}>
                <h3>Reason for Visit</h3>
                <p>{consultation.general.reasonForVisit}</p>
              </div>
              <div className={styles.infoItem}>
                <h3>Diagnosis</h3>
                <p>{consultation.general.diagnosis || 'N/A'}</p>
              </div>
            </div>
            <div className={styles.observationsSection}>
              <h3>Notes / Observations</h3>
              <p>{consultation.general.observations}</p>
            </div>
          </div>
        );

      case 'history':
        return (
          <div className={styles.generalInfo}>
            {consultation.history ? (
              <div className={styles.observationsSection}>
                <h3>Patient History</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{consultation.history}</p>
              </div>
            ) : (
              <div className={styles.noData}>No patient history recorded</div>
            )}
          </div>
        );

      case 'physical':
        const vitals = consultation.vitals || {};
        return (
          <div className={styles.vitalsInfo}>
            {Object.keys(vitals).length === 0 ? (
              <div className={styles.noData}>No vitals recorded for this consultation</div>
            ) : (
              <div className={styles.vitalsGrid}>
                <div className={styles.vitalItem}>
                  <h3>Heart Rate</h3>
                  <p>{formatValue(vitals.heartRate?.value, 'bpm')}</p>
                </div>
                <div className={styles.vitalItem}>
                  <h3>Blood Pressure</h3>
                  <p>
                    {vitals.bloodPressure?.systolic && vitals.bloodPressure?.diastolic 
                      ? `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic} mmHg`
                      : 'N/A'}
                  </p>
                </div>
                <div className={styles.vitalItem}>
                  <h3>Body Temperature</h3>
                  <p>{formatValue(vitals.bodyTemperature?.value, '°C')}</p>
                </div>
                <div className={styles.vitalItem}>
                  <h3>Respiratory Rate</h3>
                  <p>{formatValue(vitals.respiratoryRate?.value, '/min')}</p>
                </div>
                {vitals.haemoglobin?.value != null && (
                  <div className={styles.vitalItem}>
                    <h3>Haemoglobin</h3>
                    <p>{formatValue(vitals.haemoglobin.value, 'g/dL')}</p>
                  </div>
                )}
                <div className={styles.vitalItem}>
                  <h3>Blood Glucose</h3>
                  <p>
                    {formatValue(vitals.bloodGlucose?.value, 'mmol/L')}
                    {vitals.bloodGlucose?.measurementType
                      ? ` (${bloodGlucoseTypeLabels[vitals.bloodGlucose.measurementType] || vitals.bloodGlucose.measurementType})`
                      : ''}
                  </p>
                </div>
                <div className={styles.vitalItem}>
                  <h3>Blood Oxygen Saturation</h3>
                  <p>
                    {formatValue(vitals.bloodOxygenSaturation?.value, '%')}
                    {vitals.bloodOxygenSaturation?.measurementContext
                      ? ` (${spo2ContextLabels[vitals.bloodOxygenSaturation.measurementContext] || vitals.bloodOxygenSaturation.measurementContext})`
                      : ''}
                  </p>
                </div>
                <div className={styles.vitalItem}>
                  <h3>BMI</h3>
                  <p>{formatValue(vitals.bmi?.value)}</p>
                </div>
                <div className={styles.vitalItem}>
                  <h3>Body Fat Percentage</h3>
                  <p>{formatValue(vitals.bodyFatPercentage?.value, '%')}</p>
                </div>
                <div className={styles.vitalItem}>
                  <h3>Weight</h3>
                  <p>{formatValue(vitals.weight?.value, 'kg')}</p>
                </div>
                <div className={styles.vitalItem}>
                  <h3>Height</h3>
                  <p>{formatValue(vitals.height?.value, 'cm')}</p>
                </div>
              </div>
            )}

            {consultation.physicalExamination && (
              <div className={styles.observationsSection}>
                <h3>Physical Examination</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{consultation.physicalExamination}</p>
              </div>
            )}
          </div>
        );

      case 'management':
        const firstMedPatient = (consultation.medications && consultation.medications[0]) || {};
        return (
          <div className={styles.generalInfo}>
            {consultation.management ? (
              <div className={styles.observationsSection}>
                <h3>Medications</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{consultation.management}</p>
              </div>
            ) : (
              <div className={styles.noData}>No management plan recorded</div>
            )}

            <div className={styles.infoGrid} style={{ marginTop: 16 }}>
              <div className={styles.infoItem}>
                <h3>Reason for Prescription</h3>
                <p>{formatValue(firstMedPatient.reasonForPrescription)}</p>
              </div>
              <div className={styles.infoItem}>
                <h3>Start Date</h3>
                <p>{formatDate(firstMedPatient.startDate)}</p>
              </div>
              <div className={styles.infoItem}>
                <h3>End Date</h3>
                <p>{formatDate(firstMedPatient.endDate)}</p>
              </div>
            </div>
          </div>
        );

      case 'labResults':
        const labResults = consultation.labResults || [];
        return (
          <div className={styles.labResultsInfo}>
            {labResults.length === 0 ? (
              <div className={styles.noData}>No lab results recorded for this consultation</div>
            ) : (
              <div className={styles.labResultsList}>
                {labResults.map((labResult, index) => (
                  <div key={index} className={styles.labResultItem}>
                    <h3>{labResult.testName || 'Unnamed Test'}</h3>
                    <div className={styles.labResultDetails}>
                      <div className={styles.labResultDetail}>
                        <span>Lab Name:</span> {formatValue(labResult.labName)}
                      </div>
                      <div className={styles.labResultDetail}>
                        <span>Date of Test:</span> {formatDate(labResult.dateOfTest)}
                      </div>
                      <div className={styles.labResultDetail}>
                        <span>Results:</span> {formatValue(labResult.results)}
                      </div>
                      <div className={styles.labResultDetail}>
                        <span>Comments:</span> {formatValue(labResult.comments || labResult.commentsOrDiagnosis)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'radiologyReports':
        const radiologyReports = consultation.radiologyReports || [];
        return (
          <div className={styles.radiologyInfo}>
            {radiologyReports.length === 0 ? (
              <div className={styles.noData}>No radiology reports recorded for this consultation</div>
            ) : (
              <div className={styles.radiologyList}>
                {radiologyReports.map((report, index) => (
                  <div key={index} className={styles.radiologyItem}>
                    <h3>{report.typeOfScan || 'Unnamed Scan'}</h3>
                    <div className={styles.radiologyDetails}>
                      <div className={styles.radiologyDetail}>
                        <span>Date:</span> {formatDate(report.date)}
                      </div>
                      <div className={styles.radiologyDetail}>
                        <span>Body Part Examined:</span> {formatValue(report.bodyPartExamined)}
                      </div>
                      <div className={styles.radiologyDetail}>
                        <span>Findings:</span> {formatValue(report.findings)}
                      </div>
                      <div className={styles.radiologyDetail}>
                        <span>Recommendations:</span> {formatValue(report.recommendations)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'files':
        const attachments = consultation.attachments || [];
        return (
          <div className={styles.filesInfo}>
            {attachments.length === 0 ? (
              <div className={styles.noData}>No files attached to this consultation</div>
            ) : (
              <div className={styles.filesList}>
                {attachments.map((file) => {
                  const canPreview = file.mimetype && (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf');
                  
                  return (
                    <div key={file._id || file.id} className={styles.fileItem}>
                      <div className={styles.fileIcon}>
                        <img src="/icons/document-icon.svg" alt="Document" />
                      </div>
                      <div className={styles.fileDetails}>
                        <h3>{file.originalName || file.filename}</h3>
                        <div className={styles.fileInfo}>
                          <span>Type: {file.mimetype || 'Unknown'}</span>
                          <span>Size: {file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'Unknown'}</span>
                          <span>Uploaded: {formatDate(file.uploadDate)}</span>
                        </div>
                      </div>
                      <div className={styles.fileActions}>
                        {canPreview && (
                          <Button
                            variant="tertiary"
                            size="small"
                            onClick={() => handleFileView(file)}
                            className={styles.viewButton}
                          >
                            View
                          </Button>
                        )}
                        <Button
                          variant="tertiary"
                          size="small"
                          onClick={() => handleFileDownload(file)}
                          className={styles.downloadButton}
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={styles.consultationContainer}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Link to="/patient/consultations" className={styles.backLink}>
            &larr; Back to Consultations
          </Link>
          <h1>Consultation Details</h1>
        </div>
        
        <div className={styles.downloadContainer} ref={downloadMenuRef}>
          <Button 
            onClick={toggleDownloadMenu} 
            className={styles.downloadButton}
            disabled={isLoading || !consultation}
          >
            Download Consultation Data ▼
          </Button>
          
          {showDownloadMenu && (
            <div className={styles.downloadMenu}>
              <button 
                className={styles.downloadOption} 
                onClick={() => handleDownload('csv')}
              >
                Download as CSV
              </button>
              <button 
                className={styles.downloadOption} 
                onClick={() => handleDownload('json')}
              >
                Download as JSON
              </button>
            </div>
          )}
        </div>
      </div>
      
      {isLoading ? (
        <div className={styles.loading}>Loading consultation details...</div>
      ) : consultation ? (
        <>
          <Card className={styles.consultationSummary}>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <h3>Date</h3>
                <p>{consultation.date}</p>
              </div>
              <div className={styles.summaryItem}>
                <h3>Type</h3>
                <p>{consultation.type}</p>
              </div>
              <div className={styles.summaryItem}>
                <h3>Specialist</h3>
                <p>{consultation.specialist}</p>
              </div>
              <div className={styles.summaryItem}>
                <h3>Clinic</h3>
                <p>{consultation.clinic}</p>
              </div>
              <div className={styles.summaryItem}>
                <h3>Reason</h3>
                <p>{consultation.reason}</p>
              </div>
            </div>
          </Card>
          
          <Card className={styles.consultationDetails}>
            <Tabs 
              tabs={tabs} 
              activeTab={activeTab} 
              onTabChange={handleTabChange} 
              className={styles.tabsContainer}
            />
            
            <div className={styles.tabContent}>
              {renderTabContent()}
            </div>
          </Card>
        </>
      ) : (
        <div className={styles.error}>
          <p>{error}</p>
          <Link to="/patient/consultations" className={styles.backToListLink}>
            Back to Consultations List
          </Link>
        </div>
      )}
    </div>
  );
};

export default PatientViewConsultation; 