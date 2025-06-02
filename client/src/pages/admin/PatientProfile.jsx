import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import LoadingIndicator from '../../components/common/LoadingIndicator/LoadingIndicator';
import { FaArrowLeft } from 'react-icons/fa';
import adminService from '../../services/admin.service';
import styles from './PatientProfile.module.css';

// Import any components from the patient interface that are needed
import PatientLayout from '../../components/layouts/RoleLayouts/PatientLayout';

const PatientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await adminService.getUserById(id);
        setPatient(data);
      } catch (err) {
        setError('Failed to load patient details. Please try again.');
        console.error('Error fetching patient:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatient();
  }, [id]);

  const handleReturn = () => {
    navigate(`/admin/patients/${id}`);
  };

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.returnBar}>
          <button className={styles.returnButton} onClick={handleReturn}>
            <FaArrowLeft /> Return to Admin View
          </button>
        </div>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className={styles.container}>
        <div className={styles.returnBar}>
          <button className={styles.returnButton} onClick={handleReturn}>
            <FaArrowLeft /> Return to Admin View
          </button>
        </div>
        <div className={styles.error}>Patient not found</div>
      </div>
    );
  }

  // Set up a wrapped patient profile view that simulates the patient interface
  return (
    <div className={styles.profileContainer}>
      <div className={styles.returnBar}>
        <button className={styles.returnButton} onClick={handleReturn}>
          <FaArrowLeft /> Return to Admin View
        </button>
        <div className={styles.adminIndicator}>
          Viewing as {patient.firstName} {patient.lastName} (Patient)
        </div>
      </div>
      
      <div className={styles.simulatedView}>
        {/* This wrapper simulates the patient view */}
        <div className={styles.patientWrapper}>
          <div className={styles.patientHeader}>
            <img 
              src="/path-to-logo" 
              alt="Onus Logo" 
              className={styles.patientLogo} 
            />
            <div className={styles.patientUser}>
              <div className={styles.patientAvatar}>
                {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
              </div>
              <div className={styles.patientName}>
                {patient.firstName} {patient.lastName}
              </div>
            </div>
          </div>
          
          <div className={styles.patientLayout}>
            <div className={styles.patientSidebar}>
              <nav className={styles.patientNav}>
                <ul>
                  <li className={styles.activeLink}>Dashboard</li>
                  <li>Consultations</li>
                  <li>Medical Records</li>
                  <li>Connections</li>
                  <li>Profile</li>
                  <li>Settings</li>
                </ul>
              </nav>
            </div>
            
            <div className={styles.patientContent}>
              <h1>Patient Dashboard</h1>
              <p className={styles.simulationNotice}>
                <strong>Admin View Note:</strong> This is a simulated view of how the patient interface appears. 
                Actual interactions are limited in this view.
              </p>
              
              <div className={styles.dashboardCards}>
                <div className={styles.card}>
                  <h3>Recent Consultations</h3>
                  <div className={styles.emptyState}>No recent consultations</div>
                </div>
                
                <div className={styles.card}>
                  <h3>Connected Providers</h3>
                  <div className={styles.emptyState}>No connected providers</div>
                </div>
                
                <div className={styles.card}>
                  <h3>Upcoming Appointments</h3>
                  <div className={styles.emptyState}>No upcoming appointments</div>
                </div>
                
                <div className={styles.card}>
                  <h3>Recent Medical Records</h3>
                  <div className={styles.emptyState}>No recent medical records</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile; 