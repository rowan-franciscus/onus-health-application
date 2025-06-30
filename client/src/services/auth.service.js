import ApiService from './api.service';
import config from '../config';
import jwt_decode from 'jwt-decode';

/**
 * Authentication service
 * Handles user authentication, token management, and related operations
 */
class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data (email, password, role)
   * @returns {Promise} - Registration response
   */
  static async register(userData) {
    try {
      return await ApiService.post('/auth/register', userData);
    } catch (error) {
      console.error('Registration error:', error);
      // Format error message from API or use a generic one
      const errorMessage = error.userMessage || 'Registration failed. Please try again.';
      throw new Error(errorMessage);
    }
  }

  /**
   * Log in a user
   * @param {Object} credentials - User credentials (email, password)
   * @returns {Promise} - Login response with token
   */
  static async login(credentials) {
    try {
      console.log('Attempting login with credentials:', { 
        ...credentials, 
        password: credentials.password ? '****' : undefined 
      });
      
      const response = await ApiService.post('/auth/login', credentials);
      console.log('Login response received:', { 
        success: response.success, 
        user: response.user ? { 
          ...response.user,
          id: response.user.id ? 'present' : 'missing', 
          role: response.user.role,
          isProfileCompleted: response.user.isProfileCompleted,
          onboardingCompleted: response.user.onboardingCompleted
        } : 'missing' 
      });
      
      // The server returns tokens in tokens.authToken and tokens.refreshToken
      if (response.tokens) {
        // Store tokens
        this.setToken(response.tokens.authToken);
        if (response.tokens.refreshToken) {
          this.setRefreshToken(response.tokens.refreshToken);
        }
        
        // Store last login time
        this.setLastLoginTime();
        
        // Add success flag for consistent return format
        return {
          success: true,
          user: response.user
        };
      }
      
      console.warn('Login response missing tokens:', response);
      return response;
    } catch (error) {
      console.error('Login error details:', { 
        message: error.message, 
        response: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : 'No response',
        request: error.request ? 'Request was made but no response received' : 'No request made'
      });
      
      // Handle provider verification error specifically
      if (error.response && 
          error.response.data && 
          error.response.data.code === 'PROVIDER_NOT_VERIFIED') {
        
        // For providers pending verification, we'll return a special error
        // that the login component can use to redirect to verification pending page
        throw new Error('PROVIDER_NOT_VERIFIED');
      }
      
      const errorMessage = error.userMessage || 'Login failed. Please check your credentials.';
      throw new Error(errorMessage);
    }
  }

  /**
   * Admin login
   * @param {Object} credentials - Admin credentials (email, password)
   * @returns {Promise} - Login response with token
   */
  static async adminLogin(credentials) {
    try {
      console.log('Attempting admin login with credentials:', { 
        ...credentials, 
        password: credentials.password ? '****' : undefined 
      });
      
      const response = await ApiService.post('/auth/admin/login', credentials);
      console.log('Admin login response received:', response);
      
      // The server returns tokens in tokens.authToken and tokens.refreshToken
      if (response.tokens) {
        console.log('Storing tokens in localStorage...');
        
        // Store tokens directly with the token key
        localStorage.setItem(config.tokenKey, response.tokens.authToken);
        console.log('Auth token stored in localStorage with key:', config.tokenKey);
        
        if (response.tokens.refreshToken) {
          localStorage.setItem(config.refreshTokenKey, response.tokens.refreshToken);
          console.log('Refresh token stored in localStorage with key:', config.refreshTokenKey);
        }
        
        // Store last login time
        localStorage.setItem('lastLoginTime', Date.now().toString());
        
        // Verify token was stored correctly
        const storedToken = localStorage.getItem(config.tokenKey);
        console.log('Verification - Retrieved token from localStorage:', storedToken ? 'Token exists' : 'No token found');
        
        // Add success flag for consistent return format
        return {
          success: true,
          user: response.user
        };
      }
      
      console.warn('Admin login response missing tokens:', response);
      return response;
    } catch (error) {
      console.error('Admin login error:', error);
      const errorMessage = error.userMessage || 'Admin login failed. Please check your credentials.';
      throw new Error(errorMessage);
    }
  }

  /**
   * Social login/signup (Google, Facebook)
   * @param {string} provider - Social provider ('google' or 'facebook')
   * @param {string} role - User role ('patient' or 'provider')
   * @returns {Promise} - Login response with token
   */
  static async socialAuth(provider, role) {
    try {
      const response = await ApiService.post('/auth/social-auth', { 
        provider, 
        role 
      });
      
      if (response.success && response.authUrl) {
        // Return auth URL for redirect
        return response;
      }
      
      throw new Error('Invalid response from social authentication');
    } catch (error) {
      console.error('Social auth error:', error);
      const errorMessage = error.userMessage || `${provider} authentication failed. Please try again.`;
      throw new Error(errorMessage);
    }
  }

  /**
   * Process social login callback
   * @param {string} provider - Social provider ('google' or 'facebook')
   * @param {Object} queryParams - Query parameters from callback URL
   * @returns {Promise} - Login response with token
   */
  static async processSocialCallback(provider, queryParams) {
    try {
      const response = await ApiService.post(
        '/auth/social-callback', 
        { provider, queryParams }
      );
      
      if (response.success && response.token) {
        // Store tokens
        this.setToken(response.token);
        if (response.refreshToken) {
          this.setRefreshToken(response.refreshToken);
        }
        
        // Store last login time
        this.setLastLoginTime();
      }
      
      return response;
    } catch (error) {
      console.error('Social callback error:', error);
      const errorMessage = error.userMessage || 'Social login failed. Please try again.';
      throw new Error(errorMessage);
    }
  }

  /**
   * Log out the current user
   */
  static logout() {
    // Remove tokens and user data from localStorage
    localStorage.removeItem(config.tokenKey);
    localStorage.removeItem(config.refreshTokenKey);
    localStorage.removeItem('lastLoginTime');
    
    // If you're using any server-side logout, add the API call here
  }

  /**
   * Request password reset
   * @param {Object} data - Contains email
   * @returns {Promise} - Response
   */
  static async requestPasswordReset(data) {
    try {
      const response = await ApiService.post('/auth/password-reset-request', data);
      return { success: true, ...response };
    } catch (error) {
      console.error('Password reset request error:', error);
      const errorMessage = error.userMessage || 'Failed to request password reset. Please try again.';
      throw new Error(errorMessage);
    }
  }

  /**
   * Reset password with token
   * @param {Object} data - Contains token and new password
   * @returns {Promise} - Response
   */
  static async resetPassword(data) {
    try {
      const response = await ApiService.post('/auth/password-reset', data);
      return { success: true, ...response };
    } catch (error) {
      console.error('Password reset error:', error);
      const errorMessage = error.userMessage || 'Failed to reset password. Please try again.';
      throw new Error(errorMessage);
    }
  }

  /**
   * Verify email address with token
   * @param {string} token - Verification token from email
   * @returns {Promise} - Response with user data on success
   */
  static async verifyEmail(token) {
    try {
      return await ApiService.post('/auth/verify-email', { token });
    } catch (error) {
      console.error('Email verification error:', error);
      const errorMessage = error.userMessage || 'Email verification failed. Please try again.';
      throw new Error(errorMessage);
    }
  }

  /**
   * Resend verification email
   * @param {Object} data - Contains email address
   * @returns {Promise} - Response
   */
  static async resendVerificationEmail(data) {
    try {
      return await ApiService.post('/auth/resend-verification', data);
    } catch (error) {
      console.error('Resend verification error:', error);
      const errorMessage = error.userMessage || 'Failed to resend verification email. Please try again.';
      throw new Error(errorMessage);
    }
  }

  /**
   * Refresh the authentication token
   * @returns {Promise} - New token
   */
  static async refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      // Check if token is expired before attempting to refresh
      // This prevents refresh attempts with obviously expired tokens
      try {
        const decodedRefreshToken = jwt_decode(refreshToken);
        const currentTime = Date.now() / 1000;
        
        if (decodedRefreshToken.exp && decodedRefreshToken.exp < currentTime) {
          console.warn('Refresh token is expired, forcing logout');
          this.logout();
          throw new Error('Refresh token expired');
        }
      } catch (decodeError) {
        console.error('Invalid refresh token format', decodeError);
        this.logout();
        throw new Error('Invalid refresh token format');
      }

      const response = await ApiService.post('/auth/refresh-token', { refreshToken });
      
      if (response.success && response.token) {
        this.setToken(response.token);
        if (response.refreshToken) {
          this.setRefreshToken(response.refreshToken);
        }
      }
      
      return response;
    } catch (error) {
      console.error('Token refresh error:', error);
      // Clear tokens on refresh failure
      this.logout();
      throw error;
    }
  }

  /**
   * Get the current user data from the token
   * @returns {Object|null} - User data or null if not authenticated
   */
  static getCurrentUser() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const decodedToken = jwt_decode(token);
      
      // Check if token is expired
      const currentTime = Date.now() / 1000;
      if (decodedToken.exp < currentTime) {
        // Token is expired
        this.logout();
        return null;
      }
      
      // Ensure onboardingCompleted is properly set based on isProfileCompleted
      // This ensures compatibility with the ProtectedRoute component
      if (decodedToken.isProfileCompleted !== undefined && decodedToken.onboardingCompleted === undefined) {
        decodedToken.onboardingCompleted = decodedToken.isProfileCompleted;
      }
      
      return decodedToken;
    } catch (error) {
      console.error('JWT decode error:', error);
      this.logout();
      return null;
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} - True if user is authenticated
   */
  static isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decodedToken = jwt_decode(token);
      const currentTime = Date.now() / 1000;
      
      // Check if token is expired
      return decodedToken.exp > currentTime;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user role
   * @returns {string|null} - User role or null if not authenticated
   */
  static getUserRole() {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  }

  /**
   * Store the authentication token
   * @param {string} token - JWT token
   */
  static setToken(token) {
    localStorage.setItem(config.tokenKey, token);
  }

  /**
   * Get the stored authentication token
   * @returns {string|null} - JWT token or null
   */
  static getToken() {
    return localStorage.getItem(config.tokenKey);
  }

  /**
   * Store the refresh token
   * @param {string} token - Refresh token
   */
  static setRefreshToken(token) {
    localStorage.setItem(config.refreshTokenKey, token);
  }

  /**
   * Get the stored refresh token
   * @returns {string|null} - Refresh token or null
   */
  static getRefreshToken() {
    return localStorage.getItem(config.refreshTokenKey);
  }

  /**
   * Store last login time
   * @private
   */
  static setLastLoginTime() {
    localStorage.setItem('lastLoginTime', Date.now().toString());
  }

  /**
   * Get last login time
   * @returns {number|null} - Timestamp of last login or null
   */
  static getLastLoginTime() {
    const time = localStorage.getItem('lastLoginTime');
    return time ? parseInt(time, 10) : null;
  }

  /**
   * Check if session is timed out
   * @param {number} timeout - Session timeout in minutes
   * @returns {boolean} - Whether session is timed out
   */
  static isSessionTimedOut(timeout = config.sessionTimeout) {
    const lastLoginTime = this.getLastLoginTime();
    if (!lastLoginTime) return false;
    
    const currentTime = Date.now();
    const timeoutMs = timeout * 60 * 1000; // Convert minutes to ms
    
    return (currentTime - lastLoginTime) > timeoutMs;
  }
  
  /**
   * Ping the session to keep it alive
   * @returns {Promise} - Response
   */
  static async pingSession() {
    try {
      return await ApiService.get('/auth/session-status');
    } catch (error) {
      console.error('Session ping error:', error);
      throw error;
    }
  }
}

export default AuthService; 