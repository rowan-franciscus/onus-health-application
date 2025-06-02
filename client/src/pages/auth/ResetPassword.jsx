import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import AuthService from '../../services/auth.service';
import styles from './Auth.module.css';

// Logo
import { ReactComponent as OnusLogo } from '../../assets/logos/onus-logo.svg';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  // Verify token validity on component mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        // You might want to add a token verification API endpoint
        // For now, we'll just check if token exists
        if (!token) {
          setTokenValid(false);
          setError('Invalid or expired password reset link.');
        }
      } catch (err) {
        setTokenValid(false);
        setError('Invalid or expired password reset link.');
      }
    };

    verifyToken();
  }, [token]);

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
    
    setLoading(true);
    setError('');
    
    try {
      const response = await AuthService.resetPassword({
        token,
        newPassword: formData.password,
      });
      
      if (response.success) {
        setSuccess(true);
        // Redirect to sign in page after 3 seconds
        setTimeout(() => {
          navigate('/sign-in');
        }, 3000);
      } else {
        setError(response.message || 'Failed to reset password');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.logoContainer}>
          <OnusLogo className={styles.logo} />
        </div>
        
        <h1 className={styles.title}>Reset Password</h1>
        
        <div className={styles.errorMessage}>{error}</div>
        
        <div className={styles.authFooter}>
          <Link to="/forgot-password">Request a new password reset link</Link>
        </div>
        
        <div className={styles.copyright}>
          © 2025 Onus Technologies Namibia. All Rights Reserved.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authContainer}>
      <div className={styles.logoContainer}>
        <OnusLogo className={styles.logo} />
      </div>
      
      <h1 className={styles.title}>Reset Your Password</h1>
      
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      {success ? (
        <div className={styles.verificationCard}>
          <div className={styles.verificationTitle}>Password Reset Successful</div>
          <p className={styles.verificationText}>
            Your password has been reset successfully.
            <br /><br />
            You will be redirected to the sign in page in a few seconds.
          </p>
          
          <Link to="/sign-in" className={styles.submitButton}>
            Sign In Now
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.authForm}>
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>New Password*</label>
            <div className={styles.passwordInput}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                placeholder="Enter new password"
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
            <label htmlFor="confirmPassword" className={styles.label}>Confirm New Password*</label>
            <div className={styles.passwordInput}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
                placeholder="Confirm new password"
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
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}
      
      <div className={styles.copyright}>
        © 2025 Onus Technologies Namibia. All Rights Reserved.
      </div>
    </div>
  );
};

export default ResetPassword; 