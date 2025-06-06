import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, updateUser } from '../../store/slices/authSlice';
import styles from './VerificationPending.module.css';
import AuthService from '../../services/auth.service';
import api from '../../services/api.service';

const VerificationPending = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  // Check verification status when the component loads
  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        // Try to access the provider status endpoint
        const response = await api.get('/provider/status');
        
        if (response.success) {
          console.log('Provider is verified, redirecting to dashboard');
          // Update user in redux store with verified status
          dispatch(updateUser({ isVerified: true }));
          // Redirect to dashboard
          navigate('/provider/dashboard');
        }
      } catch (error) {
        // If error occurs, the provider is still not verified
        console.log('Provider verification check failed, showing pending page');
      }
    };
    
    // Only run this check if we have a provider user that has completed onboarding
    if (user && user.role === 'provider' && user.isProfileCompleted) {
      checkVerificationStatus();
    }
  }, [user, navigate, dispatch]);

  const handleSignOut = () => {
    // Log the user out before redirecting
    AuthService.logout();
    navigate('/sign-in');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <img src="/assets/logos/onus-logo.png" alt="Onus Health" />
          <h1>Health Provider Onboarding</h1>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <div className={styles.icon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
        </div>
        <h1 className={styles.title}>Verification Pending</h1>
        <p className={styles.message}>
          Thank you for completing your provider profile. Your information has been submitted for verification by our administrative team.
        </p>
        <p className={styles.details}>
          This process typically takes 1-2 business days. You will receive an email notification once your account has been verified.
        </p>
        <div className={styles.alert}>
          <strong>Important:</strong> You will not be able to access the platform's provider features until your account is verified by an administrator.
        </div>
        <div className={styles.nextSteps}>
          <h2 className={styles.nextStepsTitle}>What's Next?</h2>
          <ul className={styles.nextStepsList}>
            <li>An email has been sent to our admin team to review your application</li>
            <li>You will receive an email notification when your account is verified</li>
            <li>After verification, you can sign in using your credentials</li>
            <li>If you have not received an update after 2 business days, please contact support</li>
          </ul>
        </div>
        <div className={styles.buttonContainer}>
          <button onClick={handleSignOut} className={styles.button}>
            Return to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationPending; 