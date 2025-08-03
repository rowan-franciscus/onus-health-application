import ApiService from './api.service';
import config from '../config';

/**
 * File service for handling file operations
 */
class FileService {
  /**
   * Upload a file for consultation attachments
   * @param {string} consultationId - The consultation ID
   * @param {File} file - The file to upload
   * @param {Function} onProgress - Progress callback
   * @returns {Promise} - Response data
   */
  static async uploadConsultationFile(consultationId, file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    
    return ApiService.upload(
      `/consultations/${consultationId}/attachments`,
      formData,
      onProgress
    );
  }

  /**
   * Get attachments for a consultation
   * @param {string} consultationId - The consultation ID
   * @returns {Promise} - Response data with attachments
   */
  static async getConsultationAttachments(consultationId) {
    return ApiService.get(`/files/consultation/${consultationId}/attachments`);
  }

  /**
   * Delete a consultation attachment
   * @param {string} consultationId - The consultation ID
   * @param {string} attachmentId - The attachment ID
   * @returns {Promise} - Response data
   */
  static async deleteConsultationAttachment(consultationId, attachmentId) {
    return ApiService.delete(`/consultations/${consultationId}/attachments/${attachmentId}`);
  }

  /**
   * Get file information
   * @param {string} fileType - Type of file (licenses, consultations, profile-images)
   * @param {string} filename - The filename
   * @returns {Promise} - File information
   */
  static async getFileInfo(fileType, filename) {
    return ApiService.get(`/files/${fileType}/${filename}/info`);
  }

  /**
   * Delete a file
   * @param {string} fileType - Type of file (licenses, consultations, profile-images)
   * @param {string} filename - The filename
   * @returns {Promise} - Response data
   */
  static async deleteFile(fileType, filename) {
    return ApiService.delete(`/files/${fileType}/${filename}`);
  }

  /**
   * Generate secure file URLs
   * @param {string} type - The file type (consultations, licenses, etc.)
   * @param {string} filename - The filename
   * @returns {Object} - URLs for viewing and downloading
   */
  static getFileUrls(type, filename) {
    const token = localStorage.getItem(config.tokenKey);
    const baseUrl = `${config.apiUrl}/files/${type}/${filename}`;
    
    return {
      viewUrl: `${baseUrl}?inline=true&token=${token}`,
      downloadUrl: `${baseUrl}?token=${token}`
    };
  }

  /**
   * Upload profile picture
   * @param {File} file - The image file to upload
   * @returns {Promise} - Response data with profile image URL
   */
  static async uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    return ApiService.upload('/users/profile-picture', formData);
  }

  /**
   * Delete profile picture
   * @returns {Promise} - Response data
   */
  static async deleteProfilePicture() {
    return ApiService.delete('/users/profile-picture');
  }

  /**
   * Get profile picture URL with authentication
   * @param {string} profileImagePath - The profile image path from user object
   * @param {string} userId - The user ID (optional, for public access)
   * @returns {string} - URL for profile picture
   */
  static getProfilePictureUrl(profileImagePath, userId) {
    if (!profileImagePath) return null;
    
    // If userId is provided, use the public endpoint to avoid CORS issues
    if (userId) {
      return `${config.apiUrl}/files/public/profile/${userId}`;
    }
    
    // Fallback to token-based URL (might have CORS issues)
    const token = localStorage.getItem(config.tokenKey);
    
    // If it's already a full URL with token, return as is
    if (profileImagePath.includes('token=')) {
      return profileImagePath;
    }
    
    // If it's a relative path, build the full URL
    if (profileImagePath.startsWith('/api/')) {
      const url = `${config.apiUrl}${profileImagePath.replace('/api', '')}?inline=true&token=${token}`;
      return url;
    }
    
    return profileImagePath;
  }

  /**
   * Download a file
   * @param {string} fileType - Type of file (licenses, consultations, profile-images)
   * @param {string} filename - The filename
   * @param {string} originalName - Original filename for download
   * @param {Function} onProgress - Progress callback
   * @returns {Promise} - Blob data
   */
  static async downloadFile(fileType, filename, originalName = null, onProgress = null) {
    try {
      const blob = await ApiService.download(
        `/files/${fileType}/${filename}`,
        {},
        onProgress
      );
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = originalName || filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return blob;
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  /**
   * View a file in a new tab
   * @param {string} fileType - Type of file (licenses, consultations, profile-images)
   * @param {string} filename - The filename
   */
  static viewFile(fileType, filename) {
    // Use full API URL to avoid React Router intercepting the request
    const baseUrl = config.apiUrl.replace(/\/api$/, ''); // Remove /api suffix if present
    
    // Get JWT token from localStorage
    const token = localStorage.getItem(config.tokenKey || 'onus_auth_token');
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    
    const viewUrl = `${baseUrl}/api/files/${fileType}/${filename}?inline=true${tokenParam}`;
    window.open(viewUrl, '_blank');
  }

  /**
   * Validate file type and size
   * @param {File} file - The file to validate
   * @param {Object} options - Validation options
   * @param {Array} options.allowedTypes - Array of allowed MIME types
   * @param {number} options.maxSize - Maximum file size in bytes
   * @returns {Object} - Validation result
   */
  static validateFile(file, options = {}) {
    const {
      allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      maxSize = 5 * 1024 * 1024 // 5MB default
    } = options;

    const errors = [];

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      errors.push(`File size ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds maximum of ${maxSizeMB}MB`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format file size to human readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} - Formatted file size
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file icon based on MIME type
   * @param {string} mimetype - The MIME type
   * @returns {string} - Icon name or class
   */
  static getFileIcon(mimetype) {
    if (mimetype.startsWith('image/')) {
      return 'image';
    } else if (mimetype === 'application/pdf') {
      return 'pdf';
    } else if (mimetype.includes('word') || mimetype.includes('document')) {
      return 'document';
    } else if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) {
      return 'spreadsheet';
    } else {
      return 'file';
    }
  }
}

export default FileService; 