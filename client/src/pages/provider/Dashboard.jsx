import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styles from './Dashboard.module.css';

// Component imports
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import SearchBox from '../../components/common/SearchBox';
import { toast } from 'react-toastify';
import ApiService from '../../services/api.service';

const ProviderDashboard = () => {
  const [recentPatients, setRecentPatients] = useState([]);
  const [recentConsultations, setRecentConsultations] = useState([]);
  const [patientMetrics, setPatientMetrics] = useState({
    total: 0,
    recent: 0,
    pendingRequests: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const user = useSelector(state => state.auth.user);
  const verificationStatus = user?.isVerified;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        // Get dashboard data from the API
        const response = await ApiService.get('/provider/dashboard');
        
        if (response && response.success) {
          const { dashboardData } = response;
          
          // Set patient metrics
          setPatientMetrics({
            total: dashboardData.patientCount || 0,
            recent: dashboardData.newPatientsThisWeek || 0,
            pendingRequests: dashboardData.pendingRequests || 0
          });
          
          // Set recent consultations
          if (dashboardData.recentConsultations) {
            setRecentConsultations(dashboardData.recentConsultations.map(consultation => ({
              id: consultation._id,
              patientName: consultation.patient ? `${consultation.patient.firstName} ${consultation.patient.lastName}` : 'Unknown Patient',
              date: new Date(consultation.date).toISOString().split('T')[0],
              type: consultation.general?.specialty || 'Consultation',
              reason: consultation.general?.reasonForVisit || 'N/A'
            })));
          }
          
          // Fetch recent patients (we'll use a separate call for this)
          try {
            const patientsResponse = await ApiService.get('/provider/patients');
            if (patientsResponse && patientsResponse.success) {
              // Get up to 3 patients for the dashboard
              const patientData = patientsResponse.patients.slice(0, 3).map(patient => ({
                id: patient._id,
                name: `${patient.firstName} ${patient.lastName}`,
                age: patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : 'N/A',
                lastRecord: patient.lastConsultationDate 
                  ? new Date(patient.lastConsultationDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  : 'No consultations yet',
                email: patient.email,
                phone: patient.phone || 'N/A'
              }));
              setRecentPatients(patientData);
            }
          } catch (error) {
            console.error('Error fetching patients:', error);
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Helper function to calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleAddPatient = () => {
    navigate('/provider/patients/add');
  };

  const handleCreateConsultation = () => {
    navigate('/provider/consultations/new');
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.welcomeSection}>
        <h1>Welcome, Dr. {user?.lastName || 'Provider'}</h1>
        <p className={styles.subtitle}>
          Manage your patients, consultations, and medical records
        </p>
        {!verificationStatus && (
          <div className={styles.verificationBanner}>
            <span className={styles.warningIcon}>⚠️</span>
            <span>Your account is pending verification. Some features may be limited until verification is complete.</span>
          </div>
        )}
      </div>

      <div className={styles.quickActions}>
        <Button 
          variant="primary" 
          className={styles.actionButton}
          onClick={handleAddPatient}
          disabled={!verificationStatus}
        >
          Add New Patient
        </Button>
        <Button 
          variant="secondary" 
          className={styles.actionButton}
          onClick={handleCreateConsultation}
          disabled={!verificationStatus}
        >
          Create Consultation
        </Button>
      </div>

      <div className={styles.dashboardGrid}>
        <Card className={styles.metricsCard}>
          <h2>Patient Overview</h2>
          <div className={styles.metricsGrid}>
            <div className={styles.metricItem}>
              <span className={styles.metricValue}>{patientMetrics.total}</span>
              <span className={styles.metricLabel}>Total Patients</span>
            </div>
            <div className={styles.metricItem}>
              <span className={styles.metricValue}>{patientMetrics.recent}</span>
              <span className={styles.metricLabel}>New This Week</span>
            </div>
            <div className={styles.metricItem}>
              <span className={styles.metricValue}>{patientMetrics.pendingRequests}</span>
              <span className={styles.metricLabel}>Pending Requests</span>
            </div>
          </div>
        </Card>

        <Card className={styles.recentPatientsCard}>
          <div className={styles.cardHeader}>
            <h2>Recently Viewed Patients</h2>
            <Link to="/provider/patients" className={styles.viewAllLink}>
              View All
            </Link>
          </div>
          
          {isLoading ? (
            <div className={styles.loading}>Loading patient data...</div>
          ) : recentPatients.length > 0 ? (
            <div className={styles.patientsList}>
              {recentPatients.map(patient => (
                <div key={patient.id} className={styles.patientItem}>
                  <div className={styles.patientInfo}>
                    <h3>{patient.name}</h3>
                    <p>Age: {patient.age}</p>
                    <p>Last Visit: {patient.lastRecord}</p>
                    <p>Email: {patient.email}</p>
                  </div>
                  <div className={styles.patientActions}>
                    <Link 
                      to={`/provider/patients/${patient.id}`}
                      className={styles.viewDetailsButton}
                    >
                      View Details
                    </Link>
                    <Link 
                      to={`/provider/consultations/new?patientId=${patient.id}`}
                      className={styles.newConsultationButton}
                    >
                      New Consultation
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noData}>No patients found</div>
          )}
        </Card>

        <Card className={styles.recentConsultationsCard}>
          <div className={styles.cardHeader}>
            <h2>Recent Consultations</h2>
            <Link to="/provider/consultations" className={styles.viewAllLink}>
              View All
            </Link>
          </div>
          
          {isLoading ? (
            <div className={styles.loading}>Loading consultations...</div>
          ) : recentConsultations.length > 0 ? (
            <div className={styles.consultationsList}>
              {recentConsultations.map(consultation => (
                <div key={consultation.id} className={styles.consultationItem}>
                  <div className={styles.consultationInfo}>
                    <h3>{consultation.patientName}</h3>
                    <p>Date: {consultation.date}</p>
                    <p>Type: {consultation.type}</p>
                    <p>Reason: {consultation.reason}</p>
                  </div>
                  <Link 
                    to={`/provider/consultations/${consultation.id}`}
                    className={styles.viewButton}
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noData}>No recent consultations</div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ProviderDashboard; 