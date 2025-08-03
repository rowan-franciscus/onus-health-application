import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { authStart, authSuccess, authFail } from '../../store/slices/authSlice';
import AuthService from '../../services/auth.service';
import styles from './Auth.module.css';

// Logo and icons
import { ReactComponent as OnusLogo } from '../../assets/logos/onus-logo.svg';
import { ReactComponent as GoogleIcon } from '../../assets/icons/google-icon.svg';
import { ReactComponent as FacebookIcon } from '../../assets/icons/facebook-icon.svg';

const SignIn = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('patient');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { loading, error, isAuthenticated, user } = useSelector(state => state.auth);
  const { from } = location.state || { from: { pathname: '/' } };
  
  // Check for session timeout message
  const searchParams = new URLSearchParams(location.search);
  const sessionTimedOut = searchParams.get('timeout') === 'true';

  useEffect(() => {
    // If user is authenticated, redirect based on role
    if (isAuthenticated && user) {
      const role = user.role;
      if (role === 'patient') {
        navigate('/patient/dashboard');
      } else if (role === 'provider') {
        navigate('/provider/dashboard');
      } else if (role === 'admin') {
        navigate('/admin/dashboard');
      }
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
    
    try {
      const userData = {
        ...formData,
        role: selectedRole
      };
      
      const response = await AuthService.login(userData);
      
      if (response.success) {
        // Use the user data from the response which includes profileImage
        dispatch(authSuccess(response.user));
        // Navigate based on user role
        const user = response.user;
        if (user) {
          const role = user.role;
          if (role === 'patient') {
            navigate('/patient/dashboard');
          } else if (role === 'provider') {
            navigate('/provider/dashboard');
          } else if (role === 'admin') {
            navigate('/admin/dashboard');
          }
        } else {
          navigate(from.pathname);
        }
      } else {
        // Special handling for provider verification
        if (response.message === 'PROVIDER_NOT_VERIFIED') {
          dispatch(authFail('Your provider account is pending verification by an administrator.'));
          // Redirect to the verification pending page
          navigate('/provider/verification-pending');
          return;
        }
        
        dispatch(authFail(response.message || 'Sign in failed'));
      }
    } catch (error) {
      // Special handling for provider verification
      if (error.message === 'PROVIDER_NOT_VERIFIED') {
        dispatch(authFail('Your provider account is pending verification by an administrator.'));
        // Redirect to the verification pending page
        navigate('/provider/verification-pending');
        return;
      }
      
      dispatch(authFail(error.message || 'Sign in failed'));
    }
  };

  const handleSocialLogin = (provider) => {
    // Placeholder for social login
    console.log(`Login with ${provider} as ${selectedRole}`);
    // Implementation will connect to backend OAuth routes
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
      
      <h1 className={styles.title}>Sign in to your Account</h1>
      
      {sessionTimedOut && (
        <div className={styles.sessionTimeoutMessage}>
          Your session has timed out. Please sign in again.
        </div>
      )}
      
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      <p className={styles.methodText}>Sign in as Patient or Health Provider:</p>
      
      <div className={styles.roleSelector}>
        <button 
          type="button" 
          className={`${styles.roleButton} ${selectedRole === 'patient' ? styles.roleButtonActive : ''}`}
          onClick={() => setSelectedRole('patient')}
        >
          Patient
        </button>
        <button 
          type="button" 
          className={`${styles.roleButton} ${selectedRole === 'provider' ? styles.roleButtonActive : ''}`}
          onClick={() => setSelectedRole('provider')}
        >
          Health Provider
        </button>
      </div>
      
      <div className={styles.signInOptions}>
        <p className={styles.methodText}>Select a method to sign in:</p>
        
        <div className={styles.socialButtons}>
          <button 
            type="button" 
            className={styles.socialButton}
            onClick={() => handleSocialLogin('google')}
          >
            <GoogleIcon className={styles.socialIcon} />
            <span>Google</span>
          </button>
          
          <button 
            type="button" 
            className={styles.socialButton}
            onClick={() => handleSocialLogin('facebook')}
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
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        
        <button 
          type="submit" 
          className={styles.submitButton}
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      
      <div className={styles.authFooter}>
        Don't have an account? <Link to="/sign-up">Create an account</Link>
      </div>
      
      <div className={styles.copyright}>
        © 2025 Onus Technologies Namibia. All Rights Reserved.
      </div>
    </div>
  );
};

export default SignIn; 