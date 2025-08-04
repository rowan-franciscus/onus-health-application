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
import ProfessionalInfoStep from './onboarding/ProfessionalInfoStep';
import PracticeInfoStep from './onboarding/PracticeInfoStep';
import PatientManagementStep from './onboarding/PatientManagementStep';
import DataAccessStep from './onboarding/DataAccessStep';
import DataSharingStep from './onboarding/DataSharingStep';
import SupportCommunicationStep from './onboarding/SupportCommunicationStep';
import TermsAndConditionsStep from '../shared/TermsAndConditionsStep';
import ReviewStep from './onboarding/ReviewStep';

const ProviderOnboarding = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle authentication token from URL parameters after email verification
  useEffect(() => {
    const handleTokenFromUrl = async () => {
      const urlParams = new URLSearchParams(location.search);
      const token = urlParams.get('token');
      
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
      title: 'Professional Information',
      component: ProfessionalInfoStep,
    },
    {
      title: 'Practice Information',
      component: PracticeInfoStep,
    },
    {
      title: 'Patient Management Details',
      component: PatientManagementStep,
    },
    {
      title: 'Data & Access Preferences',
      component: DataAccessStep,
    },
    {
      title: 'Data Sharing & Privacy Practices',
      component: DataSharingStep,
    },
    {
      title: 'Support & Communication',
      component: SupportCommunicationStep,
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
      console.log('Form data to submit:', formData);
      
      // Create FormData instance for file uploads
      const data = new FormData();
      
      // Add all form data except files
      data.append('role', 'provider');
      data.append('isProfileCompleted', 'true');
      data.append('termsAccepted', formData.termsAccepted ? 'true' : 'false');
      
      // Handle nested objects by stringifying them
      for (const key in formData) {
        // Skip termsAccepted since we already added it
        if (key === 'termsAccepted') continue;
        
        // Special handling for the license file
        if (key === 'professionalInfo' && formData[key].practiceLicense) {
          // If it's a File object, add it directly to FormData
          if (formData[key].practiceLicense instanceof File) {
            data.append('licenseFile', formData[key].practiceLicense);
            
            // Create a copy without the file object to prevent circular structure
            const professionalInfoCopy = {...formData[key]};
            professionalInfoCopy.practiceLicense = formData[key].practiceLicense.name;
            data.append(key, JSON.stringify(professionalInfoCopy));
          } else {
            data.append(key, JSON.stringify(formData[key]));
          }
        } else {
          // For other objects, stringify them
          if (typeof formData[key] === 'object') {
            data.append(key, JSON.stringify(formData[key]));
          } else {
            data.append(key, formData[key]);
          }
        }
      }
      
      // Log FormData entries for debugging
      console.log('FormData entries:');
      for (let pair of data.entries()) {
        console.log(pair[0], pair[1]);
      }
      
      // Submit onboarding data to API with multipart/form-data
      const response = await api.post('/users/provider-onboarding', data);

      // Update user state with onboarding completion status
      if (response.success) {
        dispatch(updateUser({ onboardingCompleted: true }));
        toast.success('Your profile has been submitted for verification.');
        
        // Navigate to verification pending page
        navigate('/provider/verification-pending');
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
          <h1>Health Provider Onboarding</h1>
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

export default ProviderOnboarding; 