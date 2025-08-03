import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { authStart, authSuccess, authFail } from '../../store/slices/authSlice';
import AuthService from '../../services/auth.service';
import config from '../../config';
import styles from './Auth.module.css';
import axios from 'axios';
import jwt_decode from 'jwt-decode';

// Logo and icons
import { ReactComponent as OnusLogo } from '../../assets/logos/onus-logo.svg';
import { ReactComponent as GoogleIcon } from '../../assets/icons/google-icon.svg';
import { ReactComponent as FacebookIcon } from '../../assets/icons/facebook-icon.svg';

const AdminSignIn = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [apiTestResult, setApiTestResult] = useState(null);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { loading, error, isAuthenticated, user } = useSelector(state => state.auth);
  
  // Check for session timeout message
  const searchParams = new URLSearchParams(location.search);
  const sessionTimedOut = searchParams.get('timeout') === 'true';

  useEffect(() => {
    // If admin is authenticated, redirect to admin dashboard
    if (isAuthenticated && user && user.role === 'admin') {
      navigate('/admin/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    dispatch(authStart());
    
    // Debug information
    console.log('Attempting admin login with:', {
      ...formData,
      password: '*'.repeat(formData.password.length) // Mask password in logs
    });
    console.log('API URL:', config.apiUrl);
    
    try {
      // Add debugging
      console.log('Sending request to:', `${config.apiUrl}/auth/admin/login`);
      const response = await AuthService.adminLogin(formData);
      console.log('Login response:', response);
      
      if (response.success) {
        // Use the user data from the response which includes profileImage
        dispatch(authSuccess(response.user));
        navigate('/admin/dashboard');
      } else {
        console.error('Authentication failed:', response);
        dispatch(authFail(response.message || 'Admin sign in failed'));
      }
    } catch (error) {
      console.error('Login error details:', error);
      // Log more error details
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error config:', error.config);
      }
      dispatch(authFail(error.message || 'Admin sign in failed'));
    }
  };

  // Direct API test using fetch to diagnose issues
  const testApiConnection = async () => {
    setApiTestResult('Testing connection...');
    try {
      // Test with a fetch request to the server's status endpoint
      const response = await fetch('http://localhost:5001/api/status/db');
      if (response.ok) {
        const data = await response.json();
        setApiTestResult(`Connection successful! Server responded with: ${JSON.stringify(data)}`);
      } else {
        setApiTestResult(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      setApiTestResult(`Connection error: ${error.message}`);
    }

    // Also try with axios
    try {
      const axiosResponse = await axios.get('http://localhost:5001/api/status/db');
      console.log('Axios test response:', axiosResponse.data);
    } catch (axiosError) {
      console.error('Axios test error:', axiosError);
    }
  };

  const handleSocialLogin = (provider) => {
    // This would typically redirect to the OAuth provider
    console.log(`Logging in with ${provider}`);
  };

  // Direct API login using axios to bypass the service layer
  const directApiLogin = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    dispatch(authStart());
    
    try {
      // Make direct API call with axios
      console.log('Attempting direct API login to:', `http://localhost:5001/api/auth/admin/login`);
      
      const axiosResponse = await axios.post(
        'http://localhost:5001/api/auth/admin/login', 
        formData, 
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );
      
      console.log('Direct API login response:', axiosResponse.data);
      
      // Handle successful response
      if (axiosResponse.data.tokens) {
        // Store tokens manually
        localStorage.setItem(config.tokenKey, axiosResponse.data.tokens.authToken);
        localStorage.setItem(config.refreshTokenKey, axiosResponse.data.tokens.refreshToken);
        localStorage.setItem('lastLoginTime', Date.now().toString());
        
        // Update Redux store
        dispatch(authSuccess(jwt_decode(axiosResponse.data.tokens.authToken)));
        navigate('/admin/dashboard');
      } else {
        dispatch(authFail('Invalid response format from server'));
      }
    } catch (error) {
      console.error('Direct API login error:', error);
      if (error.response) {
        dispatch(authFail(`Server error: ${error.response.status} - ${error.response.data.message || 'Unknown error'}`));
      } else if (error.request) {
        dispatch(authFail('No response from server. Please check your internet connection.'));
      } else {
        dispatch(authFail(`Request failed: ${error.message}`));
      }
    }
  };

  // Show loading while checking authentication state
  if (isAuthenticated && !user) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.adminAuthCard}>
      <div className={styles.logoContainer}>
        <OnusLogo className={styles.logo} />
      </div>
      
      <h1 className={styles.title}>Administrator Sign In</h1>
      
      {sessionTimedOut && (
        <div className={styles.sessionTimeoutMessage}>
          Your session has timed out. Please sign in again.
        </div>
      )}
      
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      <div className={styles.signInOptions}>
        <p className={styles.methodText}>Select a method to sign in:</p>
        
        <div className={styles.socialButtons}>
          <button 
            className={styles.socialButton}
            onClick={() => handleSocialLogin('google')}
            type="button"
          >
            <GoogleIcon className={styles.socialIcon} />
            <span>Google</span>
          </button>
          
          <button 
            className={styles.socialButton}
            onClick={() => handleSocialLogin('facebook')}
            type="button"
          >
            <FacebookIcon className={styles.socialIcon} />
            <span>Facebook</span>
          </button>
        </div>
        
        <div className={styles.divider}>
          <span>or continue with email</span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className={styles.authForm}>
        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>Email*</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
            placeholder="Enter your Email"
          />
          {errors.email && <div className={styles.errorText}>{errors.email}</div>}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>Password*</label>
          <div className={styles.passwordInput}>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              placeholder="Enter your Password"
            />
            <button 
              type="button" 
              className={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.password && <div className={styles.errorText}>{errors.password}</div>}
        </div>
        
        <div className={styles.forgotPassword}>
          <a href="/forgot-password">Forgot password?</a>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          
          <button 
            type="button" 
            onClick={directApiLogin}
            className={styles.submitButton}
            disabled={loading}
            style={{ 
              flex: 1, 
              background: '#4a5568'
            }}
          >
            Direct API Login
          </button>
        </div>
      </form>
      
      {/* API connection test button and result display */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button 
          onClick={testApiConnection}
          style={{
            background: '#f0f0f0',
            border: '1px solid #ccc',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test API Connection
        </button>
        
        {apiTestResult && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            border: '1px solid #ddd',
            borderRadius: '4px',
            background: '#f9f9f9',
            fontSize: '14px',
            textAlign: 'left',
            wordBreak: 'break-word'
          }}>
            {apiTestResult}
          </div>
        )}
      </div>
      
      <div className={styles.copyright}>
        © 2025 Onus Technologies Namibia. All Rights Reserved.
      </div>
    </div>
  );
};

export default AdminSignIn; 