import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthService from '../../services/auth.service';
import styles from './Auth.module.css';

// Logo
import { ReactComponent as OnusLogo } from '../../assets/logos/onus-logo.svg';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setEmailError('');
  };

  const validateForm = () => {
    let isValid = true;
    
    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Email is invalid');
      isValid = false;
    }
    
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await AuthService.requestPasswordReset({ email });
      
      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.message || 'Failed to request password reset');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.adminAuthCard}>
      <div className={styles.logoContainer}>
        <OnusLogo className={styles.logo} />
      </div>
      
      <h1 className={styles.title}>Forgot Password</h1>
      
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      {success ? (
        <div className={styles.verificationCard}>
          <div className={styles.verificationTitle}>Check Your Email</div>
          <p className={styles.verificationText}>
            We've sent a password reset link to <span className={styles.verificationEmail}>{email}</span>.
            <br /><br />
            Please check your email and follow the instructions to reset your password.
          </p>
          
          <Link to="/sign-in" className={styles.backButton}>
            Back to Sign In
          </Link>
        </div>
      ) : (
        <>
          <p className={styles.formText}>
            Enter your email address and we'll send you a link to reset your password.
          </p>
          
          <form onSubmit={handleSubmit} className={styles.authForm}>
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>Email*</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleEmailChange}
                className={`${styles.input} ${emailError ? styles.inputError : ''}`}
                placeholder="Enter your Email"
              />
              {emailError && <div className={styles.errorText}>{emailError}</div>}
            </div>
            
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            
            <div className={styles.authFooter}>
              Remember your password? <Link to="/sign-in">Sign in</Link>
            </div>
          </form>
        </>
      )}
      
      <div className={styles.copyright}>
        © 2025 Onus Technologies Namibia. All Rights Reserved.
      </div>
    </div>
  );
};

export default ForgotPassword; 