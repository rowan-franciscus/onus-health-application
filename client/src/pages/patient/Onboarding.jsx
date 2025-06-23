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
      // Transform form data to match backend expectations
      const patientProfile = {
        // Map personalInfo to patientProfile structure
        dateOfBirth: formData.personalInfo?.dateOfBirth,
        gender: formData.personalInfo?.gender,
        address: {
          street: formData.personalInfo?.address || '',
          city: '',
          state: '',
          postalCode: '',
          country: ''
        },
        
        // Map health insurance
        insurance: {
          provider: formData.healthInsurance?.provider || '',
          plan: formData.healthInsurance?.plan || '',
          insuranceNumber: formData.healthInsurance?.number || ''
        },
        
        // Map emergency contact
        emergencyContact: {
          name: formData.healthInsurance?.emergencyContactName || '',
          phone: formData.healthInsurance?.emergencyContactPhone || '',
          relationship: formData.healthInsurance?.emergencyContactRelationship || ''
        },
        
        // Map medical history
        medicalHistory: {
          chronicConditions: formData.medicalHistory?.chronicConditions ? [formData.medicalHistory.chronicConditions] : [],
          significantIllnesses: formData.medicalHistory?.significantHistory ? [formData.medicalHistory.significantHistory] : [],
          mentalHealthHistory: formData.medicalHistory?.mentalHealth ? [formData.medicalHistory.mentalHealth] : []
        },
        
        // Map family history
        familyMedicalHistory: [
          formData.familyHistory?.chronicIllnesses || '',
          formData.familyHistory?.hereditaryConditions || ''
        ].filter(item => item),
        
        // Map current medications
        currentMedications: formData.currentMedication?.medications ? [{
          name: formData.currentMedication.medications,
          dosage: '',
          frequency: ''
        }] : [],
        
        // Map allergies
        allergies: formData.allergies?.list ? [formData.allergies.list] : [],
        
        // Map lifestyle
        lifestyle: {
          smoking: Boolean(formData.lifestyle?.smoking),
          alcohol: Boolean(formData.lifestyle?.alcohol),
          exercise: formData.lifestyle?.exercise || '',
          dietaryPreferences: ''
        },
        
        // Map immunizations
        immunisationHistory: formData.immunization?.history ? [formData.immunization.history] : []
      };

      // Submit onboarding data to API
      const response = await api.post('/users/onboarding', {
        patientProfile,
        // Also include basic user fields
        title: formData.personalInfo?.title,
        firstName: formData.personalInfo?.firstName,
        lastName: formData.personalInfo?.lastName,
        email: formData.personalInfo?.email,
        phone: formData.personalInfo?.phone,
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