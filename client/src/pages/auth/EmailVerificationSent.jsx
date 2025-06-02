import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthService from '../../services/auth.service';
import styles from './Auth.module.css';

// Logo and icons
import { ReactComponent as OnusLogo } from '../../assets/logos/onus-logo.svg';
import { ReactComponent as MedicalPattern } from '../../assets/patterns/medical-pattern.svg';

const EmailVerificationSent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';
  
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    // If no email is provided in state, redirect to sign up
    if (!email) {
      navigate('/sign-up');
    }
  }, [email, navigate]);

  useEffect(() => {
    // Countdown timer for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && resendDisabled) {
      setResendDisabled(false);
    }
  }, [countdown, resendDisabled]);

  const handleResendEmail = async () => {
    setResendDisabled(true);
    setCountdown(120); // 2 minutes countdown
    setError('');
    setResendSuccess(false);
    
    try {
      // Call API to resend verification email
      const response = await AuthService.resendVerificationEmail({ email });
      
      if (response.success) {
        setResendSuccess(true);
      } else {
        setError(response.message || 'Failed to resend verification email');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    }
  };

  return (
    <div className={styles.authContainer}>
      <MedicalPattern className={styles.patternBackground} />
      
      <div className={styles.logoContainer}>
        <OnusLogo className={styles.logo} />
      </div>
      
      <h1 className={styles.title}>Verify Your Email</h1>
      
      <div className={styles.verificationCard}>
        <div className={styles.verificationTitle}>We've sent a verification link to</div>
        <p className={styles.verificationEmail}>{email}</p>
        
        <p className={styles.verificationText}>
          Please check your email and click on the link to complete your registration.
          <br /><br />
          If you don't see it, please wait a few minutes or check your spam folder.
        </p>
        
        {error && <div className={styles.errorMessage}>{error}</div>}
        {resendSuccess && (
          <div className={styles.successMessage}>
            Verification email sent successfully!
          </div>
        )}
        
        <button 
          className={styles.resendButton}
          onClick={handleResendEmail}
          disabled={resendDisabled}
        >
          {resendDisabled 
            ? `Resend Link (${countdown}s)`
            : 'Resend Link'}
        </button>
        
        <Link to="/sign-in" className={styles.backButton}>
          Back to Sign In
        </Link>
      </div>
      
      <div className={styles.copyright}>
        © 2025 Onus Technologies Namibia. All Rights Reserved.
      </div>
    </div>
  );
};

export default EmailVerificationSent; 