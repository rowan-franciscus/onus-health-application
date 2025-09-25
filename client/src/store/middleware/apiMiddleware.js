import axios from 'axios';
import config from '../../config';

// Debug current environment and API URL
console.log('API Configuration:', {
  apiUrl: config.apiUrl,
  environment: process.env.NODE_ENV,
  reactAppApiUrl: process.env.REACT_APP_API_URL
});

// Create axios instance with improved timeout and debug info
export const api = axios.create({
  baseURL: config.apiUrl,
  headers: config.apiRequestSettings.headers,
  timeout: 15000, // Reduced timeout to 15 seconds for faster feedback
  withCredentials: config.apiRequestSettings.withCredentials
});

// Log HTTP requests in development
if (process.env.NODE_ENV !== 'production') {
  api.interceptors.request.use(request => {
    console.log('Axios request:', {
      url: request.url,
      method: request.method,
      baseURL: request.baseURL,
      headers: request.headers,
      timeout: request.timeout
    });
    return request;
  });
}

// Store reference for dispatch
let storeRef = null;

// Initialize the store reference
export const injectStore = (_store) => {
  storeRef = _store;
  console.log('Store injected into API middleware');
};

// Interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    // Get the token from localStorage using the correct key
    const token = localStorage.getItem('onus_auth_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Adding Authorization header with token');
    } else {
      console.log('No token found in localStorage');
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Log the raw error for diagnosis
    console.error('API interceptor caught error:', error);
    
    // Handle ECONNREFUSED errors with retry (development startup timing issue)
    if (error.code === 'ECONNREFUSED' || (error.message && error.message.includes('ECONNREFUSED'))) {
      const originalRequest = error.config;
      
      // Don't retry webpack hot-update files or WebSocket connections
      if (originalRequest.url && (
        originalRequest.url.includes('.hot-update.') ||
        originalRequest.url.includes('/ws') ||
        originalRequest.url.includes('sockjs-node')
      )) {
        console.log('Skipping retry for webpack/WebSocket request:', originalRequest.url);
        error.userMessage = 'Development server asset loading issue (can be ignored)';
        return Promise.reject(error);
      }
      
      // Only retry in development and if we haven't exceeded retry attempts
      if (process.env.NODE_ENV === 'development' && (!originalRequest._retryCount || originalRequest._retryCount < 3)) {
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
        
        console.log(`Server connection refused, retrying... (attempt ${originalRequest._retryCount}/3)`);
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, originalRequest._retryCount) * 1000; // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
          return await api(originalRequest);
        } catch (retryError) {
          if (originalRequest._retryCount >= 3) {
            console.error('Max retry attempts reached for server connection');
            error.userMessage = 'Server is starting up. Please wait a moment and try again.';
          }
          return Promise.reject(retryError);
        }
      } else {
        error.userMessage = 'Unable to connect to server. Please ensure the server is running.';
        return Promise.reject(error);
      }
    }
    
    // Check for CORS errors
    if (error.message && error.message.includes('Network Error')) {
      console.error('CORS or Network Error detected!', {
        message: error.message,
        config: error.config
      });
      error.userMessage = 'Network connection error. This might be due to CORS restrictions or server unavailability.';
      return Promise.reject(error);
    }
    
    // If the request doesn't have a config or we don't have a store reference yet, just reject
    if (!error.config || !storeRef) {
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    
    // Handle session timeout (special error code from server)
    if (
      error.response &&
      error.response.status === 401 &&
      error.response.data?.code === 'SESSION_TIMEOUT' &&
      !originalRequest._hasTriedSessionTimeout
    ) {
      originalRequest._hasTriedSessionTimeout = true;
      
      // Import actions dynamically to avoid circular dependency
      const { sessionTimeout } = await import('../slices/authSlice');
      storeRef.dispatch(sessionTimeout());
      
      return Promise.reject(error);
    }

    // Handle token refresh for regular 401 errors (token expired)
    if (
      error.response && 
      error.response.status === 401 && 
      !originalRequest._hasTriedRefresh
    ) {
      originalRequest._hasTriedRefresh = true;
      
      try {
        const refreshToken = localStorage.getItem(config.refreshTokenKey);
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Try to refresh the token
        // Include the current auth token in the header for session timeout validation
        const currentToken = localStorage.getItem(config.tokenKey);
        const headers = currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
        
        const response = await axios.post(`${config.apiUrl}/auth/refresh-token`, {
          refreshToken,
        }, { headers });

        if (response.data.success && response.data.tokens) {
          // Store the new tokens
          localStorage.setItem(config.tokenKey, response.data.tokens.authToken);
          
          if (response.data.tokens.refreshToken) {
            localStorage.setItem(config.refreshTokenKey, response.data.tokens.refreshToken);
          }
          
          // Update authorization header and retry request
          originalRequest.headers.Authorization = `Bearer ${response.data.tokens.authToken}`;
          return api(originalRequest);
        } else {
          // If server doesn't return a new token, force logout
          const { logout } = await import('../slices/authSlice');
          storeRef.dispatch(logout());
          throw new Error('Token refresh failed');
        }
      } catch (refreshError) {
        // If refresh fails, log the user out
        const { logout } = await import('../slices/authSlice');
        storeRef.dispatch(logout());
        return Promise.reject(refreshError);
      }
    }

    // Handle other API errors
    if (error.response) {
      // Server responded with a status code outside of 2xx range
      const errorMessage = error.response.data?.message || 'An error occurred';
      error.userMessage = errorMessage;
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received from API:', {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        timeout: error.config?.timeout
      });
      error.userMessage = 'No response from server. Please check your internet connection.';
    } else {
      // Something else happened while setting up the request
      console.error('API request setup error:', error.message);
      error.userMessage = 'Request could not be sent. Please try again.';
    }

    return Promise.reject(error);
  }
);

// The actual middleware
export const apiMiddleware = () => (next) => (action) => {
  return next(action);
}; 