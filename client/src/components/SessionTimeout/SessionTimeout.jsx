import React, { memo, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './SessionTimeout.module.css';

/**
 * Session timeout warning modal
 * Shows when the user is about to be logged out due to inactivity
 */
const SessionTimeout = () => {
  const { showSessionWarning, continueSession, logout } = useAuth();
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
  
  useEffect(() => {
    if (!showSessionWarning) {
      // Reset timer when modal is hidden
      setTimeLeft(180);
      return;
    }
    
    // Set up countdown timer
    const interval = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [showSessionWarning]);
  
  // Format time for display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
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
          <div className={styles.warningIcon}>⚠️</div>
          <p className={styles.warningText}>
            Your session is about to expire due to inactivity.
          </p>
          <div className={styles.countdown}>
            <p className={styles.countdownLabel}>Time remaining:</p>
            <p className={styles.countdownTimer}>{formatTime(timeLeft)}</p>
          </div>
          <p className={styles.questionText}>
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