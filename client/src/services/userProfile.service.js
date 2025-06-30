import ApiService from './api.service';

class UserProfileService {
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
   * Get current user
   * @returns {Promise} - Current user data
   */
  static async getCurrentUser() {
    try {
      const response = await ApiService.get('/users/me');
      return response;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }
}

export default UserProfileService; 