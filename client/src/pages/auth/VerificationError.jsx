import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Auth.module.css';

// Logo and icons
import { ReactComponent as OnusLogo } from '../../assets/logos/onus-logo.svg';
import { ReactComponent as MedicalPattern } from '../../assets/patterns/medical-pattern.svg';

const VerificationError = () => {
  return (
    <div className={styles.authContainer}>
      <MedicalPattern className={styles.patternBackground} />
      
      <div className={styles.logoContainer}>
        <OnusLogo className={styles.logo} />
      </div>
      
      <h1 className={styles.title}>Verify Your Email</h1>
      
      <div className={styles.verificationCard}>
        <div className={styles.verificationTitle}>Verification Failed</div>
        <p className={styles.verificationText}>
          We couldn't verify your email address. The verification link may be invalid or has expired.
        </p>
        <p className={styles.verificationText}>
          Please try signing in again or request a new verification link.
        </p>
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

export default VerificationError; 