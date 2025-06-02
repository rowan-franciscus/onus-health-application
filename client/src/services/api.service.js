import { api } from '../store/middleware/apiMiddleware';

/**
 * Base API service with common methods for HTTP requests
 */
class ApiService {
  /**
   * Make a GET request
   * @param {string} url - The endpoint URL
   * @param {Object} params - Query parameters
   * @param {Object} options - Additional options for the request
   * @returns {Promise} - Response data
   */
  static async get(url, params = {}, options = {}) {
    try {
      const response = await api.get(url, { params, ...options });
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Make a POST request
   * @param {string} url - The endpoint URL
   * @param {Object|FormData} data - Request body
   * @param {Object} options - Additional options for the request
   * @returns {Promise} - Response data
   */
  static async post(url, data = {}, options = {}) {
    try {
      // Create a copy of options to avoid mutating the original
      const configOptions = { ...options };
      
      // Detect if data is FormData and set the appropriate Content-Type
      if (data instanceof FormData) {
        // For FormData, let the browser set the Content-Type with boundary
        configOptions.headers = {
          ...configOptions.headers,
          // Remove Content-Type so browser can set it with proper boundary
          'Content-Type': undefined
        };
        console.log('FormData detected, Content-Type header will be set by browser');
      }
      
      console.log(`API POST request to: ${url}`, {
        data: url.includes('login') ? { ...data, password: '****' } : 
             (data instanceof FormData) ? '[FormData]' : data,
        options: configOptions
      });
      
      const response = await api.post(url, data, configOptions);
      console.log(`API POST response from: ${url}`, response.data);
      return response.data;
    } catch (error) {
      console.error(`API POST error for: ${url}`, error);
      
      // Enhanced error logging
      if (error.response) {
        console.error('Response error data:', error.response.data);
        console.error('Response error status:', error.response.status);
        console.error('Response error headers:', error.response.headers);
      } else if (error.request) {
        console.error('Request error (no response received):', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      console.error('Error config:', error.config);
      
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Make a PUT request
   * @param {string} url - The endpoint URL
   * @param {Object} data - Request body
   * @param {Object} options - Additional options for the request
   * @returns {Promise} - Response data
   */
  static async put(url, data = {}, options = {}) {
    try {
      const response = await api.put(url, data, options);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Make a PATCH request
   * @param {string} url - The endpoint URL
   * @param {Object} data - Request body
   * @param {Object} options - Additional options for the request
   * @returns {Promise} - Response data
   */
  static async patch(url, data = {}, options = {}) {
    try {
      const response = await api.patch(url, data, options);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Make a DELETE request
   * @param {string} url - The endpoint URL
   * @param {Object} options - Additional options for the request
   * @returns {Promise} - Response data
   */
  static async delete(url, options = {}) {
    try {
      const response = await api.delete(url, options);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Upload a file
   * @param {string} url - The endpoint URL
   * @param {FormData} formData - Form data with file
   * @param {Function} onProgress - Callback for upload progress
   * @returns {Promise} - Response data
   */
  static async upload(url, formData, onProgress = null) {
    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        };
      }

      const response = await api.post(url, formData, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Download a file
   * @param {string} url - The endpoint URL
   * @param {Object} params - Query parameters
   * @param {Function} onProgress - Callback for download progress
   * @returns {Promise} - Response data as Blob
   */
  static async download(url, params = {}, onProgress = null) {
    try {
      const config = {
        params,
        responseType: 'blob',
      };

      if (onProgress) {
        config.onDownloadProgress = (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        };
      }

      const response = await api.get(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Handle API errors
   * @param {Error} error - The error object
   * @private
   */
  static handleError(error) {
    // Log the error for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.error('API Error:', error);
    }

    // You can add custom error handling logic here
    // Like showing notifications, etc.
    return error;
  }
}

export default ApiService; 