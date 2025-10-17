import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Button from '../../components/common/Button/Button';
import LoadingIndicator from '../../components/common/LoadingIndicator/LoadingIndicator';
import { FaArrowLeft } from 'react-icons/fa';
import adminService from '../../services/admin.service';
import { formatDate } from '../../utils/dateUtils';
import styles from './ViewPatient.module.css';

const ViewPatient = () => {
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

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this patient? This action cannot be undone.')) {
      try {
        await adminService.deleteUser(id);
        navigate('/admin/patients');
      } catch (err) {
        setError('Failed to delete patient. Please try again.');
        console.error('Error deleting patient:', err);
      }
    }
  };

  const handleViewProfile = () => {
    navigate(`/admin/patients/${id}/profile`);
  };

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!patient) {
    return <div className={styles.error}>Patient not found</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/admin/patients" className={styles.backLink}>
          <FaArrowLeft /> Back to All Patients
        </Link>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => navigate(`/admin/patients/${id}/edit`)}>
            Edit
          </Button>
          <Button variant="primary" onClick={handleViewProfile}>
            View Profile
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      <h1 className={styles.title}>Personal Information</h1>
      <div className={styles.card}>
        <div className={styles.twoColumnGrid}>
          <div className={styles.field}>
            <label>Title:</label>
            <span>{patient.title || '-'}</span>
          </div>
          <div className={styles.field}>
            <label>First Name:</label>
            <span>{patient.firstName || '-'}</span>
          </div>
          <div className={styles.field}>
            <label>Last Name:</label>
            <span>{patient.lastName || '-'}</span>
          </div>
          <div className={styles.field}>
            <label>Date of Birth:</label>
            <span>{patient.patientProfile?.dateOfBirth ? formatDate(patient.patientProfile.dateOfBirth) : '-'}</span>
          </div>
          <div className={styles.field}>
            <label>Gender:</label>
            <span>{patient.patientProfile?.gender || '-'}</span>
          </div>
          <div className={styles.field}>
            <label>Email:</label>
            <span>{patient.email || '-'}</span>
          </div>
          <div className={styles.field}>
            <label>Phone Number:</label>
            <span>{patient.phone || '-'}</span>
          </div>
          <div className={styles.field}>
            <label>Address:</label>
            <span>{patient.patientProfile?.address?.street || '-'}</span>
          </div>
        </div>
      </div>

      <h1 className={styles.title}>Health Insurance</h1>
      <div className={styles.card}>
        <div className={styles.twoColumnGrid}>
          <div className={styles.field}>
            <label>Health Insurance Provider:</label>
            <span>{patient.patientProfile?.insurance?.provider || '-'}</span>
          </div>
          <div className={styles.field}>
            <label>Health Insurance Plan:</label>
            <span>{patient.patientProfile?.insurance?.plan || '-'}</span>
          </div>
          <div className={styles.field}>
            <label>Health Insurance Number:</label>
            <span>{patient.patientProfile?.insurance?.insuranceNumber || '-'}</span>
          </div>
          <div className={styles.field}>
            <label>Emergency Contact Name:</label>
            <span>{patient.patientProfile?.emergencyContact?.name || '-'}</span>
          </div>
          <div className={styles.field}>
            <label>Emergency Contact Number:</label>
            <span>{patient.patientProfile?.emergencyContact?.phone || '-'}</span>
          </div>
          <div className={styles.field}>
            <label>Emergency Contact Relationship:</label>
            <span>{patient.patientProfile?.emergencyContact?.relationship || '-'}</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ViewPatient; 