import React, { useState, useEffect } from 'react';
import styles from './Settings.module.css';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import AuthService from '../../services/auth.service';
import ApiService from '../../services/api.service';
import FileService from '../../services/file.service';
import UserProfileService from '../../services/userProfile.service';
import { logout, updateUser, authSuccess } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

// Component imports
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import ProfilePictureUpload from '../../components/common/ProfilePictureUpload';

// User settings service
const UserSettingsService = {
  // Get current user's profile
  getUserProfile: async () => {
    try {
      const response = await ApiService.get('/users/me');
      return response;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  // Update user profile
  updateUserProfile: async (profileData) => {
    try {
      const response = await ApiService.put('/users/me', profileData);
      return response;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  // Change user password
  changePassword: async (passwordData) => {
    try {
      const response = await ApiService.put('/users/change-password', passwordData);
      return response;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },

  // Update notification preferences
  updateNotifications: async (preferences) => {
    try {
      const response = await ApiService.put('/users/notifications', preferences);
      return response;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  },

  // Delete user account
  deleteAccount: async () => {
    try {
      const response = await ApiService.delete('/users/me');
      return response;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }
};

const PatientSettings = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [accountInfo, setAccountInfo] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    profileImage: null
  });
  const [editingAccountInfo, setEditingAccountInfo] = useState(false);
  const [updatedAccountInfo, setUpdatedAccountInfo] = useState({ ...accountInfo });
  const [savingAccountInfo, setSavingAccountInfo] = useState(false);

  // Password states
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account states
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Notification states
  const [notificationPreferences, setNotificationPreferences] = useState({
    emailNotifications: true,
    consultationReminders: true,
    medicationReminders: false,
    marketingEmails: false
  });
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        // Try to get user data from API
        const userData = await UserSettingsService.getUserProfile();
        
        // Set account info from user data
        setAccountInfo({
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          email: userData.email || '',
          phone: userData.phone || '',
          dateOfBirth: userData.dateOfBirth || '',
          gender: userData.gender || '',
          profileImage: userData.profileImage || null
        });
        
        // Set updated info as well for editing
        setUpdatedAccountInfo({
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          email: userData.email || '',
          phone: userData.phone || '',
          dateOfBirth: userData.dateOfBirth || '',
          gender: userData.gender || '',
          profileImage: userData.profileImage || null
        });
        
        // Set notification preferences if available from API
        if (userData.notificationPreferences) {
          setNotificationPreferences({
            emailNotifications: userData.notificationPreferences.emailNotifications ?? true,
            consultationReminders: userData.notificationPreferences.consultationReminders ?? true,
            medicationReminders: userData.notificationPreferences.medicationReminders ?? false,
            marketingEmails: userData.notificationPreferences.marketingEmails ?? false
          });
        }
        

        
      } catch (error) {
        console.error('Error fetching user data:', error);
        
        // Fallback to Redux data if API call fails
        if (user) {
          setAccountInfo({
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: user.email || '',
            phone: user.phone || '',
            dateOfBirth: user.dateOfBirth || '',
            gender: user.gender || '',
            profileImage: user.profileImage || null
          });
          setUpdatedAccountInfo({
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: user.email || '',
            phone: user.phone || '',
            dateOfBirth: user.dateOfBirth || '',
            gender: user.gender || '',
            profileImage: user.profileImage || null
          });
        }
        
        toast.error('Failed to load some of your settings. Some data may be missing.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [user]);

  // Handle account info change
  const handleAccountInfoChange = (e) => {
    const { name, value } = e.target;
    setUpdatedAccountInfo({ ...updatedAccountInfo, [name]: value });
  };

  // Save account info
  const handleSaveAccountInfo = async () => {
    setSavingAccountInfo(true);
    
    try {
      // Split name into first and last name
      const nameParts = updatedAccountInfo.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Prepare data for API
      const updateData = {
        firstName,
        lastName,
        // Email removed - cannot be updated
        phone: updatedAccountInfo.phone,
        dateOfBirth: updatedAccountInfo.dateOfBirth,
        gender: updatedAccountInfo.gender
      };
      
      // Call API to update profile
      await UserSettingsService.updateUserProfile(updateData);
      
      // Update local state
      setAccountInfo(updatedAccountInfo);
      setEditingAccountInfo(false);
      toast.success('Account information updated successfully');
    } catch (error) {
      console.error('Error updating account info:', error);
      toast.error('Failed to update account information. Please try again.');
    } finally {
      setSavingAccountInfo(false);
    }
  };

  // Handle password change
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
  };

  // Validate password
  const validatePassword = (password) => {
    // Password must be at least 8 characters, include one uppercase, one number and one special char
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;
    return regex.test(password);
  };

  // Change password
  const handleChangePassword = async () => {
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (!validatePassword(passwordData.newPassword)) {
      toast.error('Password does not meet requirements');
      return;
    }
    
    setChangingPassword(true);
    
    try {
      // Call API to change password
      await UserSettingsService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      toast.success('Password changed successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.response?.status === 401) {
        toast.error('Current password is incorrect');
      } else {
        toast.error('Failed to change password. Please try again.');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle notification preference change
  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotificationPreferences({ ...notificationPreferences, [name]: checked });
  };

  // Save notification preferences
  const handleSaveNotifications = async () => {
    setSavingNotifications(true);
    
    try {
      // Call API to update notification preferences
      await UserSettingsService.updateNotifications(notificationPreferences);
      toast.success('Notification preferences updated successfully');
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast.error('Failed to update notification preferences. Please try again.');
    } finally {
      setSavingNotifications(false);
    }
  };

  // Handle delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm account deletion.');
      return;
    }
    
    setDeletingAccount(true);
    
    try {
      // Call API to delete account
      await UserSettingsService.deleteAccount();
      
      // Reset state
      setDeletingAccount(false);
      setShowDeleteConfirmation(false);
      setDeleteConfirmation('');
      
      // Logout the user
      dispatch(logout());
      
      // Redirect to sign-in page
      window.location.href = '/sign-in';
      
      toast.success('Your account has been deleted successfully');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account. Please try again.');
      setDeletingAccount(false);
    }
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = async (file) => {
    try {
      const response = await FileService.uploadProfilePicture(file);
      
      // Fetch fresh user data from server to get updated profile info
      const freshUserData = await UserProfileService.getCurrentUser();
      
      // Update Redux store with fresh user data
      dispatch(authSuccess(freshUserData));
      
      // Update local state
      const newProfileImage = freshUserData.profileImage;
      setAccountInfo(prev => ({ ...prev, profileImage: newProfileImage }));
      setUpdatedAccountInfo(prev => ({ ...prev, profileImage: newProfileImage }));
      
      return response;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  };

  // Handle profile picture removal
  const handleProfilePictureRemove = async () => {
    try {
      await FileService.deleteProfilePicture();
      
      // Fetch fresh user data from server to get updated profile info
      const freshUserData = await UserProfileService.getCurrentUser();
      
      // Update Redux store with fresh user data
      dispatch(authSuccess(freshUserData));
      
      // Update local state
      setAccountInfo(prev => ({ ...prev, profileImage: null }));
      setUpdatedAccountInfo(prev => ({ ...prev, profileImage: null }));
    } catch (error) {
      console.error('Error removing profile picture:', error);
      throw error;
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading settings...</div>;
  }

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.header}>
        <h1>Settings</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      {/* Account Information */}
      <Card className={styles.settingsSection}>
        <h2>Account Information</h2>
        
        {editingAccountInfo ? (
          <div className={styles.editForm}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={updatedAccountInfo.name}
                onChange={handleAccountInfoChange}
                className={styles.input}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={updatedAccountInfo.email}
                className={styles.input}
                disabled={true}
                readOnly={true}
                title="Email cannot be changed"
              />
              <small className={styles.fieldHint}>Email addresses cannot be changed for security reasons</small>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={updatedAccountInfo.phone}
                onChange={handleAccountInfoChange}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="dateOfBirth">Date of Birth</label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={updatedAccountInfo.dateOfBirth}
                onChange={handleAccountInfoChange}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                name="gender"
                value={updatedAccountInfo.gender}
                onChange={handleAccountInfoChange}
                className={styles.input}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Profile Picture</label>
              <ProfilePictureUpload
                currentImage={accountInfo.profileImage ? FileService.getProfilePictureUrl(accountInfo.profileImage, user?._id || user?.id) : null}
                onUpload={handleProfilePictureUpload}
                onDelete={handleProfilePictureRemove}
                size="large"
              />
            </div>
            
            <div className={styles.formActions}>
              <Button
                onClick={() => {
                  setEditingAccountInfo(false);
                  setUpdatedAccountInfo({ ...accountInfo });
                }}
                variant="secondary"
                className={styles.cancelButton}
              >
                Cancel
              </Button>
              
              <Button
                onClick={handleSaveAccountInfo}
                className={styles.saveButton}
                disabled={savingAccountInfo || !updatedAccountInfo.name || !updatedAccountInfo.email}
              >
                {savingAccountInfo ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.infoDisplay}>
            <div className={styles.infoGroup}>
              <div className={styles.infoLabel}>Full Name</div>
              <div className={styles.infoValue}>{accountInfo.name}</div>
            </div>
            
            <div className={styles.infoGroup}>
              <div className={styles.infoLabel}>Email Address</div>
              <div className={styles.infoValue}>{accountInfo.email}</div>
            </div>

            <div className={styles.infoGroup}>
              <div className={styles.infoLabel}>Phone Number</div>
              <div className={styles.infoValue}>{accountInfo.phone || 'N/A'}</div>
            </div>

            <div className={styles.infoGroup}>
              <div className={styles.infoLabel}>Date of Birth</div>
              <div className={styles.infoValue}>{accountInfo.dateOfBirth || 'N/A'}</div>
            </div>

            <div className={styles.infoGroup}>
              <div className={styles.infoLabel}>Gender</div>
              <div className={styles.infoValue}>{accountInfo.gender || 'N/A'}</div>
            </div>

            <div className={styles.infoGroup}>
              <div className={styles.infoLabel}>Profile Picture</div>
              <div className={styles.profileImageContainer}>
                <ProfilePictureUpload
                  currentImage={accountInfo.profileImage ? FileService.getProfilePictureUrl(accountInfo.profileImage, user?._id || user?.id) : null}
                  onUpload={handleProfilePictureUpload}
                  onDelete={handleProfilePictureRemove}
                  size="medium"
                  disabled={false}
                />
              </div>
            </div>
            
            <Button
              onClick={() => setEditingAccountInfo(true)}
              className={styles.editButton}
            >
              Edit Information
            </Button>
          </div>
        )}
      </Card>

      {/* Password */}
      <Card className={styles.settingsSection}>
        <h2>Change Password</h2>
        
        <div className={styles.editForm}>
          <div className={styles.formGroup}>
            <label htmlFor="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              className={styles.input}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              className={styles.input}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              className={styles.input}
            />
          </div>
          
          <div className={styles.passwordRequirements}>
            <p>Password must:</p>
            <ul>
              <li>Be at least 8 characters long</li>
              <li>Include at least one uppercase letter</li>
              <li>Include at least one number</li>
              <li>Include at least one special character</li>
            </ul>
          </div>
          
          <Button
            onClick={handleChangePassword}
            className={styles.passwordButton}
            disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
          >
            {changingPassword ? 'Changing Password...' : 'Change Password'}
          </Button>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className={styles.settingsSection}>
        <h2>Notification Preferences</h2>
        
        <div className={styles.notificationOptions}>
          <div className={styles.notificationOption}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="emailNotifications"
                checked={notificationPreferences.emailNotifications}
                onChange={handleNotificationChange}
                className={styles.checkbox}
              />
              <span>Email Notifications</span>
            </label>
            <div className={styles.optionDescription}>
              Receive important updates about your account and health records.
            </div>
          </div>
          
          <div className={styles.notificationOption}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="consultationReminders"
                checked={notificationPreferences.consultationReminders}
                onChange={handleNotificationChange}
                className={styles.checkbox}
              />
              <span>Consultation Reminders</span>
            </label>
            <div className={styles.optionDescription}>
              Get reminders about upcoming and scheduled consultations.
            </div>
          </div>
          
          <div className={styles.notificationOption}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="medicationReminders"
                checked={notificationPreferences.medicationReminders}
                onChange={handleNotificationChange}
                className={styles.checkbox}
              />
              <span>Medication Reminders</span>
            </label>
            <div className={styles.optionDescription}>
              Receive reminders to take your prescribed medications.
            </div>
          </div>
          
          <div className={styles.notificationOption}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="marketingEmails"
                checked={notificationPreferences.marketingEmails}
                onChange={handleNotificationChange}
                className={styles.checkbox}
              />
              <span>Marketing Emails</span>
            </label>
            <div className={styles.optionDescription}>
              Receive promotional content and health tips.
            </div>
          </div>
        </div>
        
        <Button
          onClick={handleSaveNotifications}
          className={styles.saveButton}
          disabled={savingNotifications}
        >
          {savingNotifications ? 'Saving Preferences...' : 'Save Preferences'}
        </Button>
      </Card>

      {/* Delete Account */}
      <Card className={styles.settingsSection}>
        <h2>Delete Account</h2>
        
        <div className={styles.dangerZone}>
          <p className={styles.warningText}>
            Warning: This action cannot be undone. All your personal information, medical records, and health data will be permanently deleted.
          </p>
          
          {showDeleteConfirmation ? (
            <div className={styles.deleteConfirmation}>
              <p>To confirm account deletion, please type DELETE in the field below:</p>
              
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className={styles.confirmationInput}
                placeholder="Type DELETE to confirm"
              />
              
              <div className={styles.confirmationActions}>
                <Button
                  onClick={() => {
                    setShowDeleteConfirmation(false);
                    setDeleteConfirmation('');
                  }}
                  variant="secondary"
                  className={styles.cancelButton}
                >
                  Cancel
                </Button>
                
                <Button
                  onClick={handleDeleteAccount}
                  className={styles.deleteButton}
                  disabled={deletingAccount || deleteConfirmation !== 'DELETE'}
                >
                  {deletingAccount ? 'Deleting Account...' : 'Confirm Deletion'}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowDeleteConfirmation(true)}
              className={styles.deleteAccountButton}
            >
              Delete Account
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PatientSettings; 