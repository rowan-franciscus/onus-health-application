/**
 * Application Configuration
 * Centralizes environment variables and configuration settings
 */

const config = {
  // API endpoints - use environment variable or construct from window.location in production
  apiUrl: process.env.REACT_APP_API_URL || 
    (process.env.NODE_ENV === 'production' ? 
      `${window.location.protocol}//${window.location.host}/api` : 
      'http://localhost:5001/api'),
  
  // Authentication
  sessionTimeout: parseInt(process.env.REACT_APP_SESSION_TIMEOUT || '1800000', 10), // 30 minutes in milliseconds
  tokenKey: 'onus_auth_token',
  refreshTokenKey: 'onus_refresh_token',
  
  // Feature flags
  enableAnalytics: process.env.NODE_ENV === 'production',
  
  // UI settings
  defaultPaginationLimit: 10,
  dateFormat: 'dd/MM/yyyy',
  timeFormat: 'HH:mm',
  dateTimeFormat: 'dd/MM/yyyy HH:mm',
  
  // CORS settings
  apiRequestSettings: {
    withCredentials: false,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }
};

export default config; 