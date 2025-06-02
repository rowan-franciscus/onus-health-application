import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './ViewConsultation.module.css';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Tabs from '../../components/common/Tabs';
import ApiService from '../../services/api.service';

const PatientViewConsultation = () => {
  const { id } = useParams();
  const [consultation, setConsultation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [error, setError] = useState(null);

  useEffect(() => {
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
            notes: consultationData.general?.observations || 'No notes available',
            
            // Different medical record types
            general: {
              date: consultationData.date || consultationData.createdAt,
              specialistName: consultationData.general?.specialistName || 'N/A',
              specialty: consultationData.general?.specialty || 'N/A',
              practice: consultationData.general?.practice || 'N/A',
              reasonForVisit: consultationData.general?.reasonForVisit || 'N/A',
              observations: consultationData.general?.observations || 'No observations recorded',
            },
            
            vitals: consultationData.vitals || {},
            medications: consultationData.medications || [],
            immunizations: consultationData.immunizations || [],
            labResults: consultationData.labResults || [],
            radiologyReports: consultationData.radiologyReports || [],
            hospital: consultationData.hospitalRecords || [],
            surgery: consultationData.surgeryRecords || [],
            
            // File attachments
            files: consultationData.attachments || []
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
  }, [id]);

  // Handle tab switching
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  // Download consultation data as JSON
  const handleDownload = () => {
    if (!consultation) return;
    
    const dataStr = JSON.stringify(consultation, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `consultation_${consultation.id}_${consultation.date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Define tabs
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
                <p>{consultation.general.date}</p>
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
        return (
          <div className={styles.vitalsInfo}>
            <div className={styles.vitalsGrid}>
              {Object.entries(consultation.vitals).map(([key, value]) => (
                <div key={key} className={styles.vitalItem}>
                  <h3>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}</h3>
                  <p>{value}</p>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'medications':
        return (
          <div className={styles.medicationsInfo}>
            {consultation.medications && consultation.medications.length > 0 ? (
              <div className={styles.medicationsList}>
                {consultation.medications.map((medication, index) => (
                  <div key={index} className={styles.medicationItem}>
                    <h3>{medication.name}</h3>
                    <div className={styles.medicationDetails}>
                      <div className={styles.medicationDetail}>
                        <span>Dosage:</span> {medication.dosage}
                      </div>
                      <div className={styles.medicationDetail}>
                        <span>Frequency:</span> {medication.frequency}
                      </div>
                      <div className={styles.medicationDetail}>
                        <span>Reason:</span> {medication.reason}
                      </div>
                      <div className={styles.medicationDetail}>
                        <span>Start Date:</span> {medication.startDate}
                      </div>
                      <div className={styles.medicationDetail}>
                        <span>End Date:</span> {medication.endDate}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noData}>No medications recorded for this consultation</div>
            )}
          </div>
        );
      
      case 'immunizations':
        return (
          <div className={styles.immunizationsInfo}>
            {consultation.immunizations && consultation.immunizations.length > 0 ? (
              <div className={styles.immunizationsList}>
                {consultation.immunizations.map((immunization, index) => (
                  <div key={index} className={styles.immunizationItem}>
                    <h3>{immunization.vaccineName}</h3>
                    <div className={styles.immunizationDetails}>
                      <div className={styles.immunizationDetail}>
                        <span>Date Administered:</span> {immunization.dateAdministered}
                      </div>
                      <div className={styles.immunizationDetail}>
                        <span>Vaccine Serial Number:</span> {immunization.vaccineSerialNumber}
                      </div>
                      <div className={styles.immunizationDetail}>
                        <span>Next Due Date:</span> {immunization.nextDueDate}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noData}>No immunizations recorded for this consultation</div>
            )}
          </div>
        );
      
      case 'labResults':
        return (
          <div className={styles.labResultsInfo}>
            {consultation.labResults && consultation.labResults.length > 0 ? (
              <div className={styles.labResultsList}>
                {consultation.labResults.map((labResult, index) => (
                  <div key={index} className={styles.labResultItem}>
                    <h3>{labResult.testName}</h3>
                    <div className={styles.labResultDetails}>
                      <div className={styles.labResultDetail}>
                        <span>Lab Name:</span> {labResult.labName}
                      </div>
                      <div className={styles.labResultDetail}>
                        <span>Date:</span> {labResult.date}
                      </div>
                      <div className={styles.labResultDetail}>
                        <span>Results:</span> {labResult.results}
                      </div>
                      <div className={styles.labResultDetail}>
                        <span>Comments:</span> {labResult.comments}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noData}>No lab results recorded for this consultation</div>
            )}
          </div>
        );
      
      case 'radiologyReports':
        return (
          <div className={styles.radiologyInfo}>
            {consultation.radiologyReports && consultation.radiologyReports.length > 0 ? (
              <div className={styles.radiologyList}>
                {consultation.radiologyReports.map((report, index) => (
                  <div key={index} className={styles.radiologyItem}>
                    {/* Radiology report details */}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noData}>No radiology reports recorded for this consultation</div>
            )}
          </div>
        );
      
      case 'hospital':
        return (
          <div className={styles.hospitalInfo}>
            {consultation.hospital && consultation.hospital.length > 0 ? (
              <div className={styles.hospitalList}>
                {consultation.hospital.map((hospitalStay, index) => (
                  <div key={index} className={styles.hospitalItem}>
                    {/* Hospital stay details */}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noData}>No hospital records for this consultation</div>
            )}
          </div>
        );
      
      case 'surgery':
        return (
          <div className={styles.surgeryInfo}>
            {consultation.surgery && consultation.surgery.length > 0 ? (
              <div className={styles.surgeryList}>
                {consultation.surgery.map((surgery, index) => (
                  <div key={index} className={styles.surgeryItem}>
                    {/* Surgery details */}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noData}>No surgery records for this consultation</div>
            )}
          </div>
        );
      
      case 'files':
        return (
          <div className={styles.filesInfo}>
            {consultation.files && consultation.files.length > 0 ? (
              <div className={styles.filesList}>
                {consultation.files.map((file) => (
                  <div key={file.id} className={styles.fileItem}>
                    <div className={styles.fileIcon}>
                      <img src="/icons/document-icon.svg" alt="Document" />
                    </div>
                    <div className={styles.fileDetails}>
                      <h3>{file.name}</h3>
                      <div className={styles.fileInfo}>
                        <span>Type: {file.type.split('/')[1].toUpperCase()}</span>
                        <span>Size: {file.size}</span>
                        <span>Uploaded: {file.uploadedDate}</span>
                      </div>
                    </div>
                    <Button className={styles.downloadButton}>
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noData}>No files attached to this consultation</div>
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
        
        <Button 
          onClick={handleDownload} 
          className={styles.downloadButton}
          disabled={isLoading || !consultation}
        >
          Download Consultation Data
        </Button>
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