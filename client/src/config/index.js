/**
 * Application Configuration
 * Centralizes environment variables and configuration settings
 */

const config = {
  // API endpoints - use environment variable in production, relative path in development
  apiUrl: process.env.REACT_APP_API_URL || '/api',
  
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