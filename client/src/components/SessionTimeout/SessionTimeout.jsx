import React, { memo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './SessionTimeout.module.css';

/**
 * Session timeout warning modal
 * Shows when the user is about to be logged out due to inactivity
 */
const SessionTimeout = () => {
  const { showSessionWarning, continueSession, logout } = useAuth();
  
  if (!showSessionWarning) {
    return null;
  }
  
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Session Timeout Warning</h3>
        </div>
        
        <div className={styles.modalBody}>
          <p>
            Your session is about to expire due to inactivity. 
            You will be automatically logged out in 1 minute.
          </p>
          <p>
            Would you like to continue your session?
          </p>
        </div>
        
        <div className={styles.modalFooter}>
          <button 
            className={styles.logoutButton}
            onClick={logout}
          >
            Logout Now
          </button>
          <button 
            className={styles.continueButton}
            onClick={continueSession}
          >
            Continue Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(SessionTimeout); 