import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authSuccess } from '../../store/slices/authSlice';
import AuthService from '../../services/auth.service';
import styles from './Auth.module.css';

// Logo and icons
import { ReactComponent as OnusLogo } from '../../assets/logos/onus-logo.svg';
import { ReactComponent as MedicalPattern } from '../../assets/patterns/medical-pattern.svg';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

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
          
          // Store the authentication token and update Redux store
          if (response.token && response.user) {
            // Set tokens in localStorage
            AuthService.setToken(response.token);
            if (response.refreshToken) {
              AuthService.setRefreshToken(response.refreshToken);
            }
            
            // Update Redux store with user data
            await dispatch(authSuccess(response.user));
            
            // Log for debugging
            console.log('Email verified successfully', {
              user: response.user,
              onboardingCompleted: response.user.onboardingCompleted,
              isProfileCompleted: response.user.isProfileCompleted,
              role: response.user.role,
              hasToken: !!AuthService.getToken(),
              tokenFromStorage: localStorage.getItem('onus_auth_token') ? 'exists' : 'missing',
              refreshTokenFromStorage: localStorage.getItem('onus_refresh_token') ? 'exists' : 'missing'
            });
            
            // Force a small delay to ensure all state updates propagate
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Set redirecting state
            setRedirecting(true);
            
            // If successful, redirect to appropriate page after a delay
            setTimeout(() => {
              if (response.user && response.user.role) {
                // Redirect based on role and onboarding status
                if (response.user.onboardingCompleted || response.user.isProfileCompleted) {
                  if (response.user.role === 'patient') {
                    window.location.href = '/patient/dashboard';
                  } else if (response.user.role === 'provider') {
                    window.location.href = '/provider/dashboard';
                  } else {
                    window.location.href = '/sign-in';
                  }
                } else {
                  // User needs onboarding - use window.location to force a full page load
                  // This ensures the app reinitializes with the authenticated state
                  if (response.user.role === 'patient') {
                    console.log('Redirecting to patient onboarding');
                    window.location.href = '/patient/onboarding';
                  } else if (response.user.role === 'provider') {
                    console.log('Redirecting to provider onboarding');
                    window.location.href = '/provider/onboarding';
                  } else {
                    window.location.href = '/sign-in';
                  }
                }
              } else {
                window.location.href = '/sign-in';
              }
            }, 2400); // Slightly less to account for the 500ms wait
          } else {
            // No token or user in response
            setError('Verification succeeded but no authentication data received');
            setTimeout(() => navigate('/sign-in'), 3000);
          }
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
            {redirecting ? 'Redirecting...' : 'You will be redirected to the next step shortly.'}
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