import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import styles from './AddPatient.module.css';

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Tabs from '../../components/common/Tabs/Tabs';
import ConnectionService from '../../services/connection.service';
import PatientService from '../../services/patient.service';

const TABS = [
  { id: 'register', label: 'Register New Patient' },
  { id: 'invite', label: 'Invite Existing Patient' },
];

// ─── Invite Existing Patient tab (unchanged logic) ───────────────────────────

const InviteExistingPatientTab = () => {
  const [patientEmail, setPatientEmail] = useState('');
  const [startConsultation, setStartConsultation] = useState(true);
  const [requestFullAccess, setRequestFullAccess] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');

  const navigate = useNavigate();

  const handleEmailChange = (e) => {
    setPatientEmail(e.target.value);
    if (emailError) setEmailError('');
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();

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
      const connectionData = {
        patientEmail: patientEmail.trim(),
        notes: notes.trim(),
        fullAccessRequested: requestFullAccess,
      };

      const response = await ConnectionService.createConnection(connectionData);

      if (response && response.success) {
        if (requestFullAccess) {
          toast.success(`Connection created with limited access. Full access request sent to ${patientEmail}.`);
        } else {
          toast.success(`Connection created with limited access for ${patientEmail}.`);
        }

        if (startConsultation) {
          navigate(`/provider/consultations/new?patientEmail=${encodeURIComponent(patientEmail)}`);
        } else {
          navigate('/provider/patients');
        }
      } else {
        throw new Error(response?.message || 'Failed to create connection');
      }
    } catch (error) {
      console.error('Error adding patient:', error);

      if (error.response?.status === 404) {
        toast.error('Patient not found. The patient may need to create an account first.');
      } else if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        toast.error('You already have a connection with this patient.');
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
            onChange={(e) => setNotes(e.target.value)}
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
              onChange={(e) => setRequestFullAccess(e.target.checked)}
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
              onChange={(e) => setStartConsultation(e.target.checked)}
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
            {isSubmitting ? 'Creating Connection...' : 'Send Invitation'}
          </Button>
        </div>
      </form>
    </>
  );
};

// ─── Register New Patient tab ─────────────────────────────────────────────────

const RegisterNewPatientTab = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    medicalAidProvider: '',
    plan: '',
  });
  const [errors, setErrors] = useState({});
  const [startConsultation, setStartConsultation] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        medicalAidProvider: formData.medicalAidProvider.trim() || undefined,
        plan: formData.plan.trim() || undefined,
      };

      const response = await PatientService.registerNewPatient(payload);

      if (response && response.success) {
        toast.success(`${formData.firstName} ${formData.lastName} has been registered successfully.`);

        if (startConsultation) {
          const { patient } = response;
          if (patient.email) {
            navigate(`/provider/consultations/new?patientEmail=${encodeURIComponent(patient.email)}`);
          } else {
            navigate(`/provider/consultations/new?patientId=${patient._id}`);
          }
        } else {
          navigate('/provider/patients');
        }
      } else {
        throw new Error(response?.message || 'Failed to register patient');
      }
    } catch (error) {
      console.error('Error registering patient:', error);
      toast.error(error.response?.data?.message || 'Failed to register patient. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className={styles.infoBanner}>
        <span className={styles.infoBannerIcon}>ⓘ</span>
        Register a patient who doesn't have an Onus account. They can link their account later.
      </div>

      <form onSubmit={handleSubmit} className={styles.registerForm}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              First Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="First name"
              className={`${styles.formInput} ${errors.firstName ? styles.inputError : ''}`}
              disabled={isSubmitting}
            />
            {errors.firstName && <div className={styles.errorMessage}>{errors.firstName}</div>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Last Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Last name"
              className={`${styles.formInput} ${errors.lastName ? styles.inputError : ''}`}
              disabled={isSubmitting}
            />
            {errors.lastName && <div className={styles.errorMessage}>{errors.lastName}</div>}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Gender <span className={styles.required}>*</span>
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={`${styles.formInput} ${styles.formSelect} ${errors.gender ? styles.inputError : ''}`}
              disabled={isSubmitting}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer not to say">Prefer not to say</option>
            </select>
            {errors.gender && <div className={styles.errorMessage}>{errors.gender}</div>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Date of Birth <span className={styles.required}>*</span>
            </label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className={`${styles.formInput} ${errors.dateOfBirth ? styles.inputError : ''}`}
              disabled={isSubmitting}
            />
            {errors.dateOfBirth && <div className={styles.errorMessage}>{errors.dateOfBirth}</div>}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Phone Number</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. +264 81 488 262 8"
              className={styles.formInput}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Patient's email address"
              className={`${styles.formInput} ${errors.email ? styles.inputError : ''}`}
              disabled={isSubmitting}
            />
            {errors.email && <div className={styles.errorMessage}>{errors.email}</div>}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Medical Aid Provider</label>
            <input
              type="text"
              name="medicalAidProvider"
              value={formData.medicalAidProvider}
              onChange={handleChange}
              placeholder="e.g. NHP, PSEMAS, NMC"
              className={styles.formInput}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Plan</label>
            <input
              type="text"
              name="plan"
              value={formData.plan}
              onChange={handleChange}
              placeholder="e.g. Titanium, Gold, Hospital"
              className={styles.formInput}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={startConsultation}
              onChange={(e) => setStartConsultation(e.target.checked)}
              disabled={isSubmitting}
            />
            <span className={styles.checkboxLabel}>
              Start a consultation for this patient after adding
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
            {isSubmitting ? 'Adding Patient...' : 'Add Patient'}
          </Button>
        </div>
      </form>
    </>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const AddPatient = () => {
  const [activeTab, setActiveTab] = useState('register');

  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const verificationStatus = user?.isVerified;

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
            <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} className={styles.tabs} />
            <div className={styles.tabContent}>
              {activeTab === 'register' ? <RegisterNewPatientTab /> : <InviteExistingPatientTab />}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default AddPatient;
