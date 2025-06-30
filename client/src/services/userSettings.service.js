import ApiService from './api.service';

class UserSettingsService {
  /**
   * Get user profile
   * @returns {Promise} - User profile data
   */
  static async getUserProfile() {
    try {
      const response = await ApiService.get('/users/profile');
      return response;
    } catch (error) {
      console.error('Get user profile error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise} - Updated user profile
   */
  static async updateUserProfile(profileData) {
    try {
      const response = await ApiService.put('/users/profile', profileData);
      return response;
    } catch (error) {
      console.error('Update user profile error:', error);
      throw error;
    }
  }

  /**
   * Change user password
   * @param {Object} passwordData - Contains currentPassword and newPassword
   * @returns {Promise} - Response
   */
  static async changePassword(passwordData) {
    try {
      const response = await ApiService.put('/users/change-password', passwordData);
      return response;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   * @param {Object} preferences - Notification preferences
   * @returns {Promise} - Response
   */
  static async updateNotifications(preferences) {
    try {
      const response = await ApiService.put('/users/notifications', preferences);
      return response;
    } catch (error) {
      console.error('Update notifications error:', error);
      throw error;
    }
  }

  /**
   * Delete user account
   * @returns {Promise} - Response
   */
  static async deleteAccount() {
    try {
      const response = await ApiService.delete('/users/account');
      return response;
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise} - Response
   */
  static async updateProfile(profileData) {
    try {
      const response = await ApiService.put('/users/profile', profileData);
      return response;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }
}

export default UserSettingsService; 