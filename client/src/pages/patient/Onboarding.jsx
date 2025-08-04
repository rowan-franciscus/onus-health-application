import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { updateUser, authSuccess } from '../../store/slices/authSlice';
import api from '../../services/api.service';
import AuthService from '../../services/auth.service';
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
import TermsAndConditionsStep from '../shared/TermsAndConditionsStep';
import ReviewStep from './onboarding/ReviewStep';

const PatientOnboarding = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle authentication token from URL parameters after email verification
  useEffect(() => {
    const handleTokenFromUrl = async () => {
      const urlParams = new URLSearchParams(location.search);
      const token = urlParams.get('token');
      const role = urlParams.get('role');
      
      if (token) {
        try {
          // Store the token
          AuthService.setToken(token);
          
          // Get user info with the token
          const response = await api.get('/auth/me');
          
          if (response.success && response.user) {
            // Update Redux store with user data
            dispatch(authSuccess(response.user));
            
            // Remove token from URL for security
            window.history.replaceState({}, document.title, location.pathname);
          }
        } catch (error) {
          console.error('Failed to authenticate with token from URL:', error);
          // If token is invalid, redirect to sign in
          navigate('/sign-in');
        }
      }
    };
    
    handleTokenFromUrl();
  }, [location, navigate, dispatch]);

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
      title: 'Terms & Conditions',
      component: TermsAndConditionsStep,
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
          insuranceNumber: formData.healthInsurance?.insuranceNumber || ''
        },
        
        // Map emergency contact - fix: use emergencyContactNumber not emergencyContactPhone
        emergencyContact: {
          name: formData.healthInsurance?.emergencyContactName || '',
          phone: formData.healthInsurance?.emergencyContactNumber || '',
          relationship: formData.healthInsurance?.emergencyContactRelationship || ''
        },
        
        // Map medical history - fix field names
        medicalHistory: {
          chronicConditions: formData.medicalHistory?.chronicConditions ? [formData.medicalHistory.chronicConditions] : [],
          significantIllnesses: formData.medicalHistory?.significantIllnesses ? [formData.medicalHistory.significantIllnesses] : [],
          mentalHealthHistory: formData.medicalHistory?.mentalHealthHistory ? [formData.medicalHistory.mentalHealthHistory] : []
        },
        
        // Map family history - fix field names
        familyMedicalHistory: [
          formData.familyHistory?.familyChronicConditions || '',
          formData.familyHistory?.hereditaryConditions || ''
        ].filter(item => item),
        
        // Map current medications - include both medications and supplements
        currentMedications: formData.currentMedication?.medications ? [{
          name: formData.currentMedication.medications,
          dosage: '',
          frequency: ''
        }] : [],
        
        // Add supplements as a separate field
        supplements: formData.currentMedication?.supplements || '',
        
        // Map allergies - fix: use knownAllergies not list
        allergies: formData.allergies?.knownAllergies ? [formData.allergies.knownAllergies] : [],
        
        // Map lifestyle - keep as strings, not booleans
        lifestyle: {
          smoking: formData.lifestyle?.smoking || '',
          alcohol: formData.lifestyle?.alcohol || '',
          exercise: formData.lifestyle?.exercise || '',
          dietaryPreferences: formData.lifestyle?.dietaryPreferences || ''
        },
        
        // Map immunizations - fix field name
        immunisationHistory: formData.immunization?.immunizationHistory ? [formData.immunization.immunizationHistory] : [],
        
        // Add terms acceptance
        termsAccepted: formData.termsAccepted || false
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