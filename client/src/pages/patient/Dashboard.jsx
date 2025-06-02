import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import styles from './Dashboard.module.css';

// Component imports
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import PatientDashboardService from '../../services/patientDashboard.service';

const PatientDashboard = () => {
  const [recentConsultations, setRecentConsultations] = useState([]);
  const [recentVitals, setRecentVitals] = useState(null);
  const [providerRequests, setProviderRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const user = useSelector(state => state.auth.user);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to fetch all data in parallel
      const [consultationsResponse, vitalsResponse, requestsResponse] = await Promise.allSettled([
        PatientDashboardService.getRecentConsultations(),
        PatientDashboardService.getRecentVitals(),
        PatientDashboardService.getProviderRequests()
      ]);
      
      // Handle consultations
      if (consultationsResponse.status === 'fulfilled') {
        const consultations = consultationsResponse.value?.consultations || [];
        console.log('Received consultations:', consultations);
        setRecentConsultations(consultations);
      } else {
        console.error('Failed to fetch consultations:', consultationsResponse.reason);
      }
      
      // Handle vitals
      if (vitalsResponse.status === 'fulfilled') {
        const vitals = vitalsResponse.value?.vitals || null;
        console.log('Received vitals:', vitals);
        setRecentVitals(vitals);
      } else {
        console.error('Failed to fetch vitals:', vitalsResponse.reason);
      }
      
      // Handle provider requests
      if (requestsResponse.status === 'fulfilled') {
        const requests = requestsResponse.value?.requests || [];
        console.log('Received provider requests:', requests);
        setProviderRequests(requests);
      } else {
        console.error('Failed to fetch provider requests:', requestsResponse.reason);
      }

      // If all requests failed, set an error message
      if (consultationsResponse.status === 'rejected' && 
          vitalsResponse.status === 'rejected' && 
          requestsResponse.status === 'rejected') {
        setError('Failed to load dashboard data. Please try again later.');
        toast.error('Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderRequest = async (requestId, action) => {
    try {
      await PatientDashboardService.respondToProviderRequest(requestId, action);
      
      // Remove the request from the list
      setProviderRequests(prevRequests => 
        prevRequests.filter(request => request.id !== requestId)
      );
      
      toast.success(`Provider request ${action === 'accept' ? 'accepted' : 'rejected'} successfully`);
    } catch (err) {
      console.error(`Error ${action}ing provider request:`, err);
      toast.error(`Failed to ${action} provider request`);
    }
  };

  // Render empty state for vitals
  const renderEmptyVitals = () => (
    <div className={styles.noData}>
      <p>No vital records available</p>
      <p className={styles.hint}>Your vitals will appear here once your healthcare provider adds them.</p>
    </div>
  );

  // Render empty state for consultations
  const renderEmptyConsultations = () => (
    <div className={styles.noData}>
      <p>No consultation records available</p>
      <p className={styles.hint}>Your consultation history will appear here once you have consultations with healthcare providers.</p>
    </div>
  );

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.welcomeSection}>
        <h1>Welcome, {user?.firstName || 'Patient'}</h1>
        <p>View your health overview, recent consultations, and provider connections</p>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
          <Button 
            variant="primary" 
            className={styles.retryButton}
            onClick={fetchDashboardData}
          >
            Retry
          </Button>
        </div>
      )}

      <div className={styles.dashboardGrid}>
        {/* Recent Vitals Summary */}
        <Card className={styles.vitalsCard}>
          <div className={styles.cardHeader}>
            <h2>Recent Vitals</h2>
            <Link to="/patient/medical-records/vitals" className={styles.viewAllLink}>
              View All
            </Link>
          </div>
          
          {isLoading ? (
            <div className={styles.loading}>Loading vitals data...</div>
          ) : !recentVitals ? (
            renderEmptyVitals()
          ) : (
            <>
              <div className={styles.vitalsGrid}>
                {recentVitals.heartRate && (
                  <div className={styles.vitalItem}>
                    <h3>Heart Rate</h3>
                    <p>{recentVitals.heartRate}</p>
                  </div>
                )}
                {recentVitals.bloodPressure && (
                  <div className={styles.vitalItem}>
                    <h3>Blood Pressure</h3>
                    <p>{recentVitals.bloodPressure}</p>
                  </div>
                )}
                {recentVitals.bodyTemperature && (
                  <div className={styles.vitalItem}>
                    <h3>Temperature</h3>
                    <p>{recentVitals.bodyTemperature}</p>
                  </div>
                )}
                {recentVitals.bloodGlucose && (
                  <div className={styles.vitalItem}>
                    <h3>Blood Glucose</h3>
                    <p>{recentVitals.bloodGlucose}</p>
                  </div>
                )}
                {recentVitals.respiratoryRate && (
                  <div className={styles.vitalItem}>
                    <h3>Respiratory Rate</h3>
                    <p>{recentVitals.respiratoryRate}</p>
                  </div>
                )}
              </div>
              {recentVitals.lastUpdated && (
                <div className={styles.lastUpdated}>
                  Last updated: {recentVitals.lastUpdated}
                </div>
              )}
            </>
          )}
        </Card>

        {/* Recent Consultations */}
        <Card className={styles.consultationsCard}>
          <div className={styles.cardHeader}>
            <h2>Recent Consultations</h2>
            <Link to="/patient/consultations" className={styles.viewAllLink}>
              View All
            </Link>
          </div>
          
          {isLoading ? (
            <div className={styles.loading}>Loading consultations...</div>
          ) : recentConsultations.length === 0 ? (
            renderEmptyConsultations()
          ) : (
            <div className={styles.consultationsList}>
              {recentConsultations.map(consultation => (
                <div key={consultation.id} className={styles.consultationItem}>
                  <div className={styles.consultationDate}>{consultation.date}</div>
                  <div className={styles.consultationDetails}>
                    <h3>{consultation.type}</h3>
                    {consultation.specialist && <p>Specialist: {consultation.specialist}</p>}
                    {consultation.clinic && <p>Clinic: {consultation.clinic}</p>}
                    {consultation.reason && <p>Reason: {consultation.reason}</p>}
                  </div>
                  <Link 
                    to={`/patient/consultations/${consultation.id}`}
                    className={styles.viewButton}
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Provider Requests */}
        <Card className={styles.providersCard}>
          <div className={styles.cardHeader}>
            <h2>Provider Connection Requests</h2>
            <Link to="/patient/connections" className={styles.viewAllLink}>
              Manage Connections
            </Link>
          </div>
          
          {isLoading ? (
            <div className={styles.loading}>Loading provider requests...</div>
          ) : providerRequests.length > 0 ? (
            <div className={styles.providersList}>
              {providerRequests.map(provider => (
                <div key={provider.id} className={styles.providerItem}>
                  <div className={styles.providerInfo}>
                    <h3>{provider.name}</h3>
                    {provider.specialty && <p>Specialty: {provider.specialty}</p>}
                    {provider.practice && <p>Practice: {provider.practice}</p>}
                    {provider.requestDate && <p>Request Date: {provider.requestDate}</p>}
                  </div>
                  <div className={styles.providerActions}>
                    <Button 
                      variant="primary" 
                      className={styles.acceptButton}
                      onClick={() => handleProviderRequest(provider.id, 'accept')}
                    >
                      Accept
                    </Button>
                    <Button 
                      variant="secondary" 
                      className={styles.rejectButton}
                      onClick={() => handleProviderRequest(provider.id, 'reject')}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noRequests}>
              No pending provider connection requests.
            </div>
          )}
        </Card>

        {/* Medical Records Overview */}
        <Card className={styles.medicalRecordsCard}>
          <div className={styles.cardHeader}>
            <h2>Medical Records</h2>
          </div>
          
          <div className={styles.recordsGrid}>
            <Link to="/patient/medical-records/vitals" className={styles.recordType}>
              <div className={styles.recordIcon}>
                <img src="/icons/vitals-icon.svg" alt="Vitals" />
              </div>
              <span>Vitals</span>
            </Link>
            <Link to="/patient/medical-records/medications" className={styles.recordType}>
              <div className={styles.recordIcon}>
                <img src="/icons/medications-icon.svg" alt="Medications" />
              </div>
              <span>Medications</span>
            </Link>
            <Link to="/patient/medical-records/immunizations" className={styles.recordType}>
              <div className={styles.recordIcon}>
                <img src="/icons/immunizations-icon.svg" alt="Immunizations" />
              </div>
              <span>Immunizations</span>
            </Link>
            <Link to="/patient/medical-records/lab-results" className={styles.recordType}>
              <div className={styles.recordIcon}>
                <img src="/icons/lab-results-icon.svg" alt="Lab Results" />
              </div>
              <span>Lab Results</span>
            </Link>
            <Link to="/patient/medical-records/radiology" className={styles.recordType}>
              <div className={styles.recordIcon}>
                <img src="/icons/radiology-icon.svg" alt="Radiology" />
              </div>
              <span>Radiology</span>
            </Link>
            <Link to="/patient/medical-records/hospital" className={styles.recordType}>
              <div className={styles.recordIcon}>
                <img src="/icons/hospital-icon.svg" alt="Hospital" />
              </div>
              <span>Hospital</span>
            </Link>
            <Link to="/patient/medical-records/surgery" className={styles.recordType}>
              <div className={styles.recordIcon}>
                <img src="/icons/surgery-icon.svg" alt="Surgery" />
              </div>
              <span>Surgery</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PatientDashboard; 