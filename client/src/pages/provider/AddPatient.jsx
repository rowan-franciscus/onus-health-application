import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import styles from './AddPatient.module.css';

// Component imports
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import ConnectionService from '../../services/connection.service';

const AddPatient = () => {
  const [patientEmail, setPatientEmail] = useState('');
  const [startConsultation, setStartConsultation] = useState(true);
  const [requestFullAccess, setRequestFullAccess] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  
  const navigate = useNavigate();
  const user = useSelector(state => state.auth.user);
  const verificationStatus = user?.isVerified;

  // Handle email input change
  const handleEmailChange = (e) => {
    setPatientEmail(e.target.value);
    // Clear error when typing
    if (emailError) setEmailError('');
  };

  // Handle checkbox changes
  const handleStartConsultationChange = (e) => {
    setStartConsultation(e.target.checked);
  };

  const handleRequestFullAccessChange = (e) => {
    setRequestFullAccess(e.target.checked);
  };

  const handleNotesChange = (e) => {
    setNotes(e.target.value);
  };

  // Validate email format
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate email
    if (!patientEmail.trim()) {
      setEmailError('Email is required');
      return;
    }
    
    if (!validateEmail(patientEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create the connection
      const connectionData = {
        patientEmail: patientEmail.trim(),
        notes: notes.trim(),
        fullAccessRequested: requestFullAccess
      };

      const response = await ConnectionService.createConnection(connectionData);
      
      if (response && response.success) {
        // Show success message
        if (requestFullAccess) {
          toast.success(`Connection created with limited access. Full access request sent to ${patientEmail}.`);
        } else {
          toast.success(`Connection created with limited access for ${patientEmail}.`);
        }
        
        if (startConsultation) {
          // Navigate to new consultation page with this patient connection
          // We'll pass the patient email so the consultation form can look up the connection
          navigate(`/provider/consultations/new?patientEmail=${encodeURIComponent(patientEmail)}`);
        } else {
          // Navigate back to patients list
          navigate('/provider/patients');
        }
      } else {
        throw new Error(response?.message || 'Failed to create connection');
      }
    } catch (error) {
      console.error('Error adding patient:', error);
      
      // Handle specific error cases
      if (error.response?.status === 404) {
        toast.error('Patient not found. The patient may need to create an account first.');
      } else if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        toast.error('You already have a connection with this patient.');
        // Still allow navigation to consultation if requested
        if (startConsultation) {
          navigate(`/provider/consultations/new?patientEmail=${encodeURIComponent(patientEmail)}`);
        } else {
          navigate('/provider/patients');
        }
      } else {
        toast.error(error.response?.data?.message || 'Failed to add patient. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.addPatientContainer}>
      <div className={styles.header}>
        <h1>Add New Patient</h1>
        <p>Connect with a patient on the Onus Health platform</p>
      </div>

      <Card className={styles.addPatientCard}>
        {!verificationStatus ? (
          <div className={styles.verificationRequired}>
            <div className={styles.warningIcon}>⚠️</div>
            <h2>Verification Required</h2>
            <p>Your account needs to be verified before you can add patients. Please check your email for verification instructions or contact support.</p>
            <Button 
              variant="primary" 
              className={styles.backButton}
              onClick={() => navigate('/provider/dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        ) : (
          <>
            <div className={styles.instructionsSection}>
              <h2>Patient Connection</h2>
              <p>Enter the patient's email address to establish a connection with them on Onus Health.</p>
              <div className={styles.accessLevelInfo}>
                <h3>Access Levels:</h3>
                <ul className={styles.infoList}>
                  <li><strong>Limited Access (Default):</strong> You can only view consultations and medical records that you create for this patient.</li>
                  <li><strong>Full Access (Requires Approval):</strong> You can view all of the patient's medical data, including consultations and records from other providers.</li>
                </ul>
              </div>
            </div>

            <form onSubmit={handleSubmit} className={styles.addPatientForm}>
              <div className={styles.formGroup}>
                <label htmlFor="patientEmail" className={styles.formLabel}>
                  Patient Email Address
                </label>
                <input
                  id="patientEmail"
                  type="email"
                  value={patientEmail}
                  onChange={handleEmailChange}
                  placeholder="Enter patient's email address"
                  className={`${styles.formInput} ${emailError ? styles.inputError : ''}`}
                  disabled={isSubmitting}
                />
                {emailError && <div className={styles.errorMessage}>{emailError}</div>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="notes" className={styles.formLabel}>
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={handleNotesChange}
                  placeholder="Add any notes about this connection or patient..."
                  className={styles.formTextarea}
                  disabled={isSubmitting}
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxContainer}>
                  <input
                    type="checkbox"
                    checked={requestFullAccess}
                    onChange={handleRequestFullAccessChange}
                    disabled={isSubmitting}
                  />
                  <span className={styles.checkboxLabel}>
                    Request full access to patient's medical data
                  </span>
                </label>
                <p className={styles.checkboxHelp}>
                  If checked, the patient will receive an email notification asking them to approve full access. 
                  They can approve or deny this request.
                </p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxContainer}>
                  <input
                    type="checkbox"
                    checked={startConsultation}
                    onChange={handleStartConsultationChange}
                    disabled={isSubmitting}
                  />
                  <span className={styles.checkboxLabel}>
                    Start a consultation for this patient after connecting
                  </span>
                </label>
              </div>

              <div className={styles.formActions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/provider/patients')}
                  disabled={isSubmitting}
                  className={styles.cancelButton}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className={styles.submitButton}
                >
                  {isSubmitting ? 'Creating Connection...' : 'Create Connection'}
                </Button>
              </div>
            </form>
          </>
        )}
      </Card>
    </div>
  );
};

export default AddPatient; 