import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import AuthService from '../../services/auth.service';
import styles from './Auth.module.css';

// Logo and icons
import { ReactComponent as OnusLogo } from '../../assets/logos/onus-logo.svg';
import { ReactComponent as MedicalPattern } from '../../assets/patterns/medical-pattern.svg';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyEmailToken = async () => {
      if (!token) {
        setError('Invalid verification link');
        setLoading(false);
        return;
      }

      try {
        // Call API to verify email token
        const response = await AuthService.verifyEmail(token);
        
        if (response.success) {
          setSuccess(true);
          
          // If successful, redirect to appropriate page after a delay
          setTimeout(() => {
            if (response.user && response.user.role) {
              // Redirect based on role and onboarding status
              if (response.user.onboardingCompleted) {
                if (response.user.role === 'patient') {
                  navigate('/patient/dashboard');
                } else if (response.user.role === 'provider') {
                  navigate('/provider/dashboard');
                } else {
                  navigate('/sign-in');
                }
              } else {
                if (response.user.role === 'patient') {
                  navigate('/patient/onboarding');
                } else if (response.user.role === 'provider') {
                  navigate('/provider/onboarding');
                } else {
                  navigate('/sign-in');
                }
              }
            } else {
              navigate('/sign-in');
            }
          }, 3000);
        } else {
          setError(response.message || 'Email verification failed');
        }
      } catch (err) {
        setError(err.message || 'An error occurred during verification');
      } finally {
        setLoading(false);
      }
    };

    verifyEmailToken();
  }, [token, navigate]);

  return (
    <div className={styles.authContainer}>
      <MedicalPattern className={styles.patternBackground} />
      
      <div className={styles.logoContainer}>
        <OnusLogo className={styles.logo} />
      </div>
      
      <h1 className={styles.title}>Verify Your Email</h1>
      
      {loading ? (
        <div className={styles.verificationCard}>
          <div className={styles.verificationTitle}>Verifying your email</div>
          <p className={styles.verificationText}>
            Please wait while we verify your email address...
          </p>
        </div>
      ) : success ? (
        <div className={styles.verificationCard}>
          <div className={styles.verificationTitle}>Thank You for Verifying!</div>
          <p className={styles.verificationText}>
            Your email has been successfully verified.
            <br /><br />
            You will be redirected to the next step shortly.
          </p>
        </div>
      ) : (
        <div className={styles.verificationCard}>
          <div className={styles.verificationTitle}>Verification Failed</div>
          <p className={styles.verificationText}>
            {error || 'The verification link is invalid or has expired.'}
          </p>
          <Link to="/sign-in" className={styles.backButton}>
            Back to Sign In
          </Link>
        </div>
      )}
      
      <div className={styles.copyright}>
        © 2025 Onus Technologies Namibia. All Rights Reserved.
      </div>
    </div>
  );
};

export default VerifyEmail; 