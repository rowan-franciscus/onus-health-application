import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Button from '../../components/common/Button/Button';
import LoadingIndicator from '../../components/common/LoadingIndicator/LoadingIndicator';
import { FaArrowLeft } from 'react-icons/fa';
import adminService from '../../services/admin.service';
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
            <span>{patient.title || '[Data]'}</span>
          </div>
          <div className={styles.field}>
            <label>First Name:</label>
            <span>{patient.firstName || '[Data]'}</span>
          </div>
          <div className={styles.field}>
            <label>Last Name:</label>
            <span>{patient.lastName || '[Data]'}</span>
          </div>
          <div className={styles.field}>
            <label>Date of Birth:</label>
            <span>{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '[Data]'}</span>
          </div>
          <div className={styles.field}>
            <label>Gender:</label>
            <span>{patient.gender || '[Data]'}</span>
          </div>
          <div className={styles.field}>
            <label>Email:</label>
            <span>{patient.email || '[Data]'}</span>
          </div>
          <div className={styles.field}>
            <label>Phone Number:</label>
            <span>{patient.phone || '[Data]'}</span>
          </div>
          <div className={styles.field}>
            <label>Address:</label>
            <span>{patient.address || '[Data]'}</span>
          </div>
        </div>
      </div>

      <h1 className={styles.title}>Health Insurance</h1>
      <div className={styles.card}>
        <div className={styles.twoColumnGrid}>
          <div className={styles.field}>
            <label>Health Insurance Provider:</label>
            <span>{patient.insurance?.provider || '[Data]'}</span>
          </div>
          <div className={styles.field}>
            <label>Health Insurance Plan:</label>
            <span>{patient.insurance?.plan || '[Data]'}</span>
          </div>
          <div className={styles.field}>
            <label>Health Insurance Number:</label>
            <span>{patient.insurance?.number || '[Data]'}</span>
          </div>
          <div className={styles.field}>
            <label>Emergency Contact Name:</label>
            <span>{patient.emergencyContact?.name || '[Data]'}</span>
          </div>
          <div className={styles.field}>
            <label>Emergency Contact Number:</label>
            <span>{patient.emergencyContact?.phone || '[Data]'}</span>
          </div>
          <div className={styles.field}>
            <label>Emergency Contact Relationship:</label>
            <span>{patient.emergencyContact?.relationship || '[Data]'}</span>
          </div>
        </div>
      </div>

      <h1 className={styles.title}>Personal Medical History</h1>
      <div className={styles.card}>
        <div className={styles.fullWidthField}>
          <label>Do you have any chronic conditions (e.g., diabetes, asthma)?:</label>
          <span>{patient.medicalHistory?.chronicConditions || '[Data]'}</span>
        </div>
        <div className={styles.fullWidthField}>
          <label>Have you had any significant illnesses, surgeries, or hospitalizations?:</label>
          <span>{patient.medicalHistory?.significantHistory || '[Data]'}</span>
        </div>
        <div className={styles.fullWidthField}>
          <label>Any mental health conditions or history?:</label>
          <span>{patient.medicalHistory?.mentalHealth || '[Data]'}</span>
        </div>
      </div>

      <h1 className={styles.title}>Family Medical History</h1>
      <div className={styles.card}>
        <div className={styles.fullWidthField}>
          <label>Does anyone in your family have a history of chronic illnesses (e.g., heart disease, cancer, diabetes)?:</label>
          <span>{patient.familyHistory?.chronicIllnesses || '[Data]'}</span>
        </div>
        <div className={styles.fullWidthField}>
          <label>Any hereditary conditions to be aware of?:</label>
          <span>{patient.familyHistory?.hereditaryConditions || '[Data]'}</span>
        </div>
      </div>

      <h1 className={styles.title}>Current Medication</h1>
      <div className={styles.card}>
        <div className={styles.fullWidthField}>
          <label>List of current medications (including dosage and frequency):</label>
          <span>{patient.currentMedication?.medications || '[Data]'}</span>
        </div>
        <div className={styles.fullWidthField}>
          <label>List of current supplements or vitamins:</label>
          <span>{patient.currentMedication?.supplements || '[Data]'}</span>
        </div>
      </div>

      <h1 className={styles.title}>Allergies</h1>
      <div className={styles.card}>
        <div className={styles.fullWidthField}>
          <label>Do you have any known allergies (medications, foods, environment, etc.)?:</label>
          <span>{patient.allergies?.list || '[Data]'}</span>
        </div>
      </div>

      <h1 className={styles.title}>Lifestyle & Habits</h1>
      <div className={styles.card}>
        <div className={styles.fullWidthField}>
          <label>Do you smoke? If yes, how frequently?:</label>
          <span>{patient.lifestyle?.smoking || '[Data]'}</span>
        </div>
        <div className={styles.fullWidthField}>
          <label>Do you consume alcohol? If yes, how frequently?:</label>
          <span>{patient.lifestyle?.alcohol || '[Data]'}</span>
        </div>
        <div className={styles.fullWidthField}>
          <label>Do you exercise? What type and how frequently?:</label>
          <span>{patient.lifestyle?.exercise || '[Data]'}</span>
        </div>
      </div>
    </div>
  );
};

export default ViewPatient; 