import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { updateUser } from '../../store/slices/authSlice';
import api from '../../services/api.service';
import MultiStepForm from '../../components/forms/MultiStepForm/MultiStepForm';
import styles from './Onboarding.module.css';

// Import step components
import PersonalInfoStep from './onboarding/PersonalInfoStep';
import HealthInsuranceStep from './onboarding/HealthInsuranceStep';
import MedicalHistoryStep from './onboarding/MedicalHistoryStep';
import FamilyHistoryStep from './onboarding/FamilyHistoryStep';
import CurrentMedicationStep from './onboarding/CurrentMedicationStep';
import AllergiesStep from './onboarding/AllergiesStep';
import LifestyleStep from './onboarding/LifestyleStep';
import ImmunizationStep from './onboarding/ImmunizationStep';
import ReviewStep from './onboarding/ReviewStep';

const PatientOnboarding = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Define steps for the multi-step form
  const steps = [
    {
      title: 'Personal Information',
      component: PersonalInfoStep,
    },
    {
      title: 'Health Insurance',
      component: HealthInsuranceStep,
    },
    {
      title: 'Personal Medical History',
      component: MedicalHistoryStep,
    },
    {
      title: 'Family Medical History',
      component: FamilyHistoryStep,
    },
    {
      title: 'Current Medication',
      component: CurrentMedicationStep,
    },
    {
      title: 'Allergies',
      component: AllergiesStep,
    },
    {
      title: 'Lifestyle & Habits',
      component: LifestyleStep,
    },
    {
      title: 'Immunization',
      component: ImmunizationStep,
    },
    {
      title: 'Review',
      component: ReviewStep,
    }
  ];

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      // Submit onboarding data to API
      const response = await api.post('/users/onboarding', {
        ...formData,
        role: 'patient',
        isProfileCompleted: true
      });

      // Update user state with onboarding completion status
      if (response.success) {
        dispatch(updateUser({ onboardingCompleted: true }));
        toast.success(response.message || 'Onboarding completed successfully!');
        navigate('/patient/dashboard');
      } else {
        toast.error(response.message || 'Failed to complete onboarding');
      }
    } catch (error) {
      console.error('Onboarding submission error:', error);
      toast.error(error.response?.data?.message || 'An error occurred during onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.onboardingContainer}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <img src="/assets/logos/onus-logo.png" alt="Onus Health" />
          <h1>Patient Onboarding</h1>
        </div>
      </div>
      <div className={styles.formContainer}>
        <div className={styles.formWrapper}>
          <MultiStepForm
            steps={steps}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};

export default PatientOnboarding; 