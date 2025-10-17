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
  { id: 'vitals', label: 'Vitals' },
  { id: 'medications', label: 'Medications' },
  { id: 'immunizations', label: 'Immunizations' },
  { id: 'labResults', label: 'Lab Results' },
  { id: 'radiologyReports', label: 'Radiology Reports' },
  { id: 'hospital', label: 'Hospital' },
  { id: 'surgery', label: 'Surgery' },
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
            date: consultationData.date || consultationData.createdAt,
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
              observations: consultationData.general?.observations || consultationData.general?.notes || 'No observations recorded',
            },
            
            vitals: consultationData.vitals || {},
            medications: consultationData.medications || [],
            immunizations: consultationData.immunizations || [],
            labResults: consultationData.labResults || [],
            radiologyReports: consultationData.radiologyReports || [],
            hospitalRecords: consultationData.hospitalRecords || [],
            surgeryRecords: consultationData.surgeryRecords || [],
            
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
            </div>
            <div className={styles.observationsSection}>
              <h3>Notes / Observations</h3>
              <p>{consultation.general.observations}</p>
            </div>
          </div>
        );
      
      case 'vitals':
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
                <div className={styles.vitalItem}>
                  <h3>Blood Glucose</h3>
                  <p>{formatValue(vitals.bloodGlucose?.value, 'mg/dL')}</p>
                </div>
                <div className={styles.vitalItem}>
                  <h3>Blood Oxygen Saturation</h3>
                  <p>{formatValue(vitals.bloodOxygenSaturation?.value, '%')}</p>
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
          </div>
        );
      
      case 'medications':
        const medications = consultation.medications || [];
        return (
          <div className={styles.medicationsInfo}>
            {medications.length === 0 ? (
              <div className={styles.noData}>No medications recorded for this consultation</div>
            ) : (
              <div className={styles.medicationsList}>
                {medications.map((medication, index) => (
                  <div key={index} className={styles.medicationItem}>
                    <h3>{medication.name || 'Unnamed Medication'}</h3>
                    <div className={styles.medicationDetails}>
                      <div className={styles.medicationDetail}>
                        <span>Dosage:</span> {medication.dosage ? `${medication.dosage.value} ${medication.dosage.unit}` : 'N/A'}
                      </div>
                      <div className={styles.medicationDetail}>
                        <span>Frequency:</span> {formatValue(medication.frequency)}
                      </div>
                      <div className={styles.medicationDetail}>
                        <span>Reason:</span> {formatValue(medication.reasonForPrescription)}
                      </div>
                      <div className={styles.medicationDetail}>
                        <span>Start Date:</span> {formatDate(medication.startDate)}
                      </div>
                      <div className={styles.medicationDetail}>
                        <span>End Date:</span> {formatDate(medication.endDate)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'immunizations':
        const immunizations = consultation.immunizations || [];
        return (
          <div className={styles.immunizationsInfo}>
            {immunizations.length === 0 ? (
              <div className={styles.noData}>No immunizations recorded for this consultation</div>
            ) : (
              <div className={styles.immunizationsList}>
                {immunizations.map((immunization, index) => (
                  <div key={index} className={styles.immunizationItem}>
                    <h3>{immunization.vaccineName || 'Unnamed Vaccine'}</h3>
                    <div className={styles.immunizationDetails}>
                      <div className={styles.immunizationDetail}>
                        <span>Date Administered:</span> {formatDate(immunization.dateAdministered)}
                      </div>
                      <div className={styles.immunizationDetail}>
                        <span>Vaccine Serial Number:</span> {formatValue(immunization.vaccineSerialNumber)}
                      </div>
                      <div className={styles.immunizationDetail}>
                        <span>Next Due Date:</span> {formatDate(immunization.nextDueDate)}
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
      
      case 'hospital':
        const hospitalRecords = consultation.hospitalRecords || [];
        return (
          <div className={styles.hospitalInfo}>
            {hospitalRecords.length === 0 ? (
              <div className={styles.noData}>No hospital records for this consultation</div>
            ) : (
              <div className={styles.hospitalList}>
                {hospitalRecords.map((hospital, index) => (
                  <div key={index} className={styles.hospitalItem}>
                    <h3>{hospital.hospitalName || 'Hospital Stay'}</h3>
                    <div className={styles.hospitalDetails}>
                      <div className={styles.hospitalDetail}>
                        <span>Hospital Name:</span> {formatValue(hospital.hospitalName)}
                      </div>
                      <div className={styles.hospitalDetail}>
                        <span>Admission Date:</span> {formatDate(hospital.admissionDate)}
                      </div>
                      <div className={styles.hospitalDetail}>
                        <span>Discharge Date:</span> {formatDate(hospital.dischargeDate)}
                      </div>
                      <div className={styles.hospitalDetail}>
                        <span>Reason for Hospitalization:</span> {formatValue(hospital.reasonForHospitalization)}
                      </div>
                      <div className={styles.hospitalDetail}>
                        <span>Treatments Received:</span> 
                        {hospital.treatmentsReceived && hospital.treatmentsReceived.length > 0 
                          ? hospital.treatmentsReceived.join(', ') 
                          : 'N/A'}
                      </div>
                      <div className={styles.hospitalDetail}>
                        <span>Attending Doctors:</span> 
                        {hospital.attendingDoctors && hospital.attendingDoctors.length > 0 
                          ? hospital.attendingDoctors.map(doc => doc.name || doc).join(', ')
                          : 'N/A'}
                      </div>
                      <div className={styles.hospitalDetail}>
                        <span>Discharge Summary:</span> {formatValue(hospital.dischargeSummary)}
                      </div>
                      <div className={styles.hospitalDetail}>
                        <span>Investigations Done:</span> 
                        {hospital.investigationsDone && hospital.investigationsDone.length > 0 
                          ? hospital.investigationsDone.join(', ') 
                          : 'N/A'}
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
          <div className={styles.surgeryInfo}>
            {surgeryRecords.length === 0 ? (
              <div className={styles.noData}>No surgery records for this consultation</div>
            ) : (
              <div className={styles.surgeryList}>
                {surgeryRecords.map((surgery, index) => (
                  <div key={index} className={styles.surgeryItem}>
                    <h3>{surgery.typeOfSurgery || 'Unnamed Surgery'}</h3>
                    <div className={styles.surgeryDetails}>
                      <div className={styles.surgeryDetail}>
                        <span>Date:</span> {formatDate(surgery.date)}
                      </div>
                      <div className={styles.surgeryDetail}>
                        <span>Reason:</span> {formatValue(surgery.reason)}
                      </div>
                      <div className={styles.surgeryDetail}>
                        <span>Complications:</span> {formatValue(surgery.complications)}
                      </div>
                      <div className={styles.surgeryDetail}>
                        <span>Recovery Notes:</span> {formatValue(surgery.recoveryNotes)}
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