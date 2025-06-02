import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import styles from './ViewPatient.module.css';

// Component imports
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Tabs from '../../components/common/Tabs';
import PatientService from '../../services/patient.service';

const ProviderViewPatient = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [accessRequestStatus, setAccessRequestStatus] = useState(null);
  const user = useSelector(state => state.auth.user);
  const verificationStatus = user?.isVerified;

  // Tabs for medical record types
  const recordTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'vitals', label: 'Vitals' },
    { id: 'medications', label: 'Medications' },
    { id: 'immunizations', label: 'Immunizations' },
    { id: 'lab-results', label: 'Lab Results' },
    { id: 'radiology', label: 'Radiology' },
    { id: 'hospital', label: 'Hospital' },
    { id: 'surgery', label: 'Surgery' }
  ];

  useEffect(() => {
    fetchPatientData();
  }, [id]);

  // Fetch patient data
  const fetchPatientData = async () => {
    try {
      setIsLoading(true);
      
      // Use the real patient service to fetch patient details
      const response = await PatientService.getPatientById(id);
      
      if (response && response.success && response.patient) {
        const patientData = response.patient;
        // Transform the data to match our component's expected format
        const formattedPatient = {
          id: patientData._id,
          name: `${patientData.firstName} ${patientData.lastName}`,
          gender: patientData.patientProfile?.gender || 'N/A',
          dateOfBirth: patientData.patientProfile?.dateOfBirth ? 
            new Date(patientData.patientProfile.dateOfBirth).toLocaleDateString() : 'N/A',
          age: patientData.patientProfile?.dateOfBirth ? 
            new Date().getFullYear() - new Date(patientData.patientProfile.dateOfBirth).getFullYear() : 'N/A',
          email: patientData.email,
          phone: patientData.phone || 'N/A',
          address: patientData.patientProfile?.address ? 
            `${patientData.patientProfile.address.street}, ${patientData.patientProfile.address.city}, ${patientData.patientProfile.address.state}` : 'N/A',
          insurance: {
            provider: patientData.patientProfile?.insurance?.provider || 'N/A',
            planType: patientData.patientProfile?.insurance?.plan || 'N/A',
            memberId: patientData.patientProfile?.insurance?.insuranceNumber || 'N/A'
          },
          emergencyContact: {
            name: patientData.patientProfile?.emergencyContact?.name || 'N/A',
            relationship: patientData.patientProfile?.emergencyContact?.relationship || 'N/A',
            phone: patientData.patientProfile?.emergencyContact?.phone || 'N/A'
          },
          accessLevel: 'full', // Since this is an approved connection
          lastConsultation: 'N/A',
          medicalHistory: {
            chronicConditions: patientData.patientProfile?.medicalHistory?.chronicConditions || [],
            allergies: patientData.patientProfile?.allergies || [],
            surgeries: patientData.patientProfile?.medicalHistory?.significantIllnesses || [],
            familyHistory: patientData.patientProfile?.familyMedicalHistory || []
          },
          consultations: [],
          vitalsHistory: []
        };
        
        setPatient(formattedPatient);
        setAccessRequestStatus(null); // Since we have access
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
              {patient.medicalHistory.chronicConditions.map((condition, index) => (
                <li key={index}>{condition}</li>
              ))}
            </ul>
          </div>
          <div className={styles.historyItem}>
            <h4>Allergies</h4>
            <ul className={styles.historyList}>
              {patient.medicalHistory.allergies.map((allergy, index) => (
                <li key={index}>{allergy}</li>
              ))}
            </ul>
          </div>
          <div className={styles.historyItem}>
            <h4>Past Surgeries</h4>
            <ul className={styles.historyList}>
              {patient.medicalHistory.surgeries.map((surgery, index) => (
                <li key={index}>{surgery}</li>
              ))}
            </ul>
          </div>
          <div className={styles.historyItem}>
            <h4>Family Medical History</h4>
            <ul className={styles.historyList}>
              {patient.medicalHistory.familyHistory.map((history, index) => (
                <li key={index}>{history}</li>
              ))}
            </ul>
          </div>
        </div>
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

  // Render recent consultations
  const renderConsultations = () => {
    if (!patient || !patient.consultations || patient.consultations.length === 0) {
      return (
        <div className={styles.noConsultations}>
          No consultations available
        </div>
      );
    }
    
    return (
      <div className={styles.consultationsSection}>
        <h3>Recent Consultations</h3>
        <div className={styles.consultationsList}>
          {patient.consultations.map(consultation => (
            <div key={consultation.id} className={styles.consultationItem}>
              <div className={styles.consultationHeader}>
                <div className={styles.consultationDate}>{consultation.date}</div>
                <div className={styles.consultationProvider}>{consultation.provider}</div>
              </div>
              <div className={styles.consultationReason}>
                <span className={styles.reasonLabel}>Reason:</span> {consultation.reason}
              </div>
              <div className={styles.consultationNotes}>
                <span className={styles.notesLabel}>Notes:</span> {consultation.notes}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render vitals data
  const renderVitals = () => {
    if (!patient || !patient.vitalsHistory || patient.vitalsHistory.length === 0) {
      return (
        <div className={styles.noRecords}>
          No vitals records available
        </div>
      );
    }
    
    const latestVitals = patient.vitalsHistory[0];
    
    return (
      <div className={styles.vitalsSection}>
        <div className={styles.vitalsHeader}>
          <h3>Vitals</h3>
          <div className={styles.vitalsDate}>Last recorded: {latestVitals.date}</div>
        </div>
        <div className={styles.vitalsGrid}>
          <div className={styles.vitalItem}>
            <span className={styles.vitalLabel}>Heart Rate</span>
            <span className={styles.vitalValue}>{latestVitals.heartRate}</span>
          </div>
          <div className={styles.vitalItem}>
            <span className={styles.vitalLabel}>Blood Pressure</span>
            <span className={styles.vitalValue}>{latestVitals.bloodPressure}</span>
          </div>
          <div className={styles.vitalItem}>
            <span className={styles.vitalLabel}>Body Temperature</span>
            <span className={styles.vitalValue}>{latestVitals.bodyTemperature}</span>
          </div>
          <div className={styles.vitalItem}>
            <span className={styles.vitalLabel}>Respiratory Rate</span>
            <span className={styles.vitalValue}>{latestVitals.respiratoryRate}</span>
          </div>
          <div className={styles.vitalItem}>
            <span className={styles.vitalLabel}>Oxygen Saturation</span>
            <span className={styles.vitalValue}>{latestVitals.bloodOxygenSaturation}</span>
          </div>
          <div className={styles.vitalItem}>
            <span className={styles.vitalLabel}>Weight</span>
            <span className={styles.vitalValue}>{latestVitals.weight}</span>
          </div>
          <div className={styles.vitalItem}>
            <span className={styles.vitalLabel}>Height</span>
            <span className={styles.vitalValue}>{latestVitals.height}</span>
          </div>
          <div className={styles.vitalItem}>
            <span className={styles.vitalLabel}>BMI</span>
            <span className={styles.vitalValue}>{latestVitals.bmi}</span>
          </div>
        </div>
        
        <div className={styles.viewHistoryLink}>
          <Link to={`/provider/medical-records/vitals?patientId=${id}`}>
            View Complete Vitals History
          </Link>
        </div>
      </div>
    );
  };

  // Render content based on active tab
  const renderTabContent = () => {
    if (isLoading) {
      return <div className={styles.loading}>Loading patient data...</div>;
    }
    
    if (!patient) {
      return <div className={styles.notFound}>Patient not found</div>;
    }
    
    switch (activeTab) {
      case 'overview':
        return (
          <div className={styles.overviewTab}>
            <Card className={styles.infoCard}>
              {renderPatientInfo()}
            </Card>
            
            <Card className={styles.medicalHistoryCard}>
              {renderMedicalHistory()}
            </Card>
            
            <Card className={styles.emergencyContactCard}>
              {renderEmergencyContact()}
            </Card>
            
            <Card className={styles.consultationsCard}>
              {renderConsultations()}
            </Card>
          </div>
        );
      case 'vitals':
        return (
          <Card className={styles.medicalRecordCard}>
            {renderVitals()}
          </Card>
        );
      default:
        return (
          <div className={styles.accessLimited}>
            {patient.accessLevel === 'full' ? (
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