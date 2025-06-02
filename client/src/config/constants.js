/**
 * Application Constants
 * Central location for application-wide constants
 */

// API configuration
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Authentication
export const SESSION_TIMEOUT = parseInt(process.env.REACT_APP_SESSION_TIMEOUT || '1800000', 10); // 30 minutes in ms
export const TOKEN_KEY = 'onus_auth_token';
export const REFRESH_TOKEN_KEY = 'onus_refresh_token';

// UI settings
export const DEFAULT_PAGINATION_LIMIT = 10;
export const DATE_FORMAT = 'dd/MM/yyyy';
export const TIME_FORMAT = 'HH:mm';
export const DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';

// User roles
export const ROLES = {
  ADMIN: 'admin',
  PROVIDER: 'provider',
  PATIENT: 'patient',
};

// Medical record types
export const RECORD_TYPES = {
  VITALS: 'vitals',
  MEDICATIONS: 'medications',
  IMMUNIZATIONS: 'immunizations',
  LAB_RESULTS: 'labResults',
  RADIOLOGY: 'radiology',
  HOSPITAL: 'hospital',
  SURGERY: 'surgery',
}; 