import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { authStart, authFail } from '../../store/slices/authSlice';
import AuthService from '../../services/auth.service';
import styles from './Auth.module.css';

// Logo and icons
import { ReactComponent as OnusLogo } from '../../assets/logos/onus-logo.svg';
import { ReactComponent as GoogleIcon } from '../../assets/icons/google-icon.svg';
import { ReactComponent as FacebookIcon } from '../../assets/icons/facebook-icon.svg';

const SignUp = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('patient');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { loading, error } = useSelector(state => state.auth);

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
    
    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match';
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
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: selectedRole,
      };
      
      console.log('Sending registration data:', { ...userData, password: '****' });
      const response = await AuthService.register(userData);
      
      // Debug the registration response
      console.log('Registration response:', response);
      
      // Always navigate to email verification page after successful registration
      // The backend will send the verification email regardless
      navigate('/verify-your-email', { state: { email: formData.email } });
      
      // Let the store know about the successful registration
      if (response && response.tokens) {
        // Store any tokens if present in the response
        AuthService.setToken(response.tokens.authToken);
        AuthService.setRefreshToken(response.tokens.refreshToken);
      }
    } catch (error) {
      console.error('Registration error:', error);
      dispatch(authFail(error.message || 'Sign up failed'));
    }
  };

  const handleSocialSignUp = (provider) => {
    // Placeholder for social sign up
    console.log(`Sign up with ${provider} as ${selectedRole}`);
    // Implementation will connect to backend OAuth routes
  };

  return (
    <div className={styles.authPageContainer}>
      <div className={`${styles.adminAuthCard} ${styles.signUpCard}`}>
        <div className={styles.logoContainer}>
          <OnusLogo className={styles.logo} />
        </div>
      
      <h1 className={styles.title}>Create an Account</h1>
      
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      <p className={styles.methodText}>Sign up as Patient or Health Provider:</p>
      
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
      
      {/* TEMPORARILY DISABLED - Social login not yet implemented */}
      {/* <div className={styles.signInOptions}>
        <p className={styles.methodText}>Select a method to sign up:</p>
        
        <div className={styles.socialButtons}>
          <button 
            type="button" 
            className={styles.socialButton}
            onClick={() => handleSocialSignUp('google')}
          >
            <GoogleIcon className={styles.socialIcon} />
            <span>Google</span>
          </button>
          
          <button 
            type="button" 
            className={styles.socialButton}
            onClick={() => handleSocialSignUp('facebook')}
          >
            <FacebookIcon className={styles.socialIcon} />
            <span>Facebook</span>
          </button>
        </div>
        
        <div className={styles.divider}>
          <span>or continue with email</span>
        </div>
      </div> */}
      
      <form onSubmit={handleSubmit} className={styles.authForm}>
        <div className={styles.formGroup}>
          <label htmlFor="firstName" className={styles.label}>First Name*</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className={`${styles.input} ${errors.firstName ? styles.inputError : ''}`}
            placeholder="Enter your First Name"
          />
          {errors.firstName && <div className={styles.errorText}>{errors.firstName}</div>}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="lastName" className={styles.label}>Last Name*</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className={`${styles.input} ${errors.lastName ? styles.inputError : ''}`}
            placeholder="Enter your Last Name"
          />
          {errors.lastName && <div className={styles.errorText}>{errors.lastName}</div>}
        </div>
        
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
        
        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword" className={styles.label}>Confirm Password*</label>
          <div className={styles.passwordInput}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
              placeholder="Confirm your Password"
            />
            <button 
              type="button" 
              className={styles.passwordToggle}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.confirmPassword && <div className={styles.errorText}>{errors.confirmPassword}</div>}
        </div>
        
        <button 
          type="submit" 
          className={styles.submitButton}
          disabled={loading}
        >
          {loading ? 'Signing up...' : 'Sign Up'}
        </button>
      </form>
      
      <div className={styles.authFooter}>
        Already have an account? <Link to="/sign-in">Sign in</Link>
      </div>
      
      <div className={styles.copyright}>
        © 2025 Onus Technologies Namibia. All Rights Reserved.
      </div>
      </div>
    </div>
  );
};

export default SignUp; 