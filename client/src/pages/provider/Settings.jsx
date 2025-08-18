import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import styles from './Settings.module.css';

// Component imports
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Alert from '../../components/common/Alert';
import ProfilePictureUpload from '../../components/common/ProfilePictureUpload';

// Service imports
import FileService from '../../services/file.service';
import ApiService from '../../services/api.service';
import UserProfileService from '../../services/userProfile.service';
import { updateUser, authSuccess } from '../../store/slices/authSlice';

const Settings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  
  // Profile state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    profileImage: null
  });
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Delete account state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    emailConsultationUpdates: true,
    emailPatientRequests: true
  });
  
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profileImage: user.profileImage
      });
    }
  }, [user]);
  
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when typing
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const validatePasswordForm = () => {
    const errors = {};
    let isValid = true;
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
      isValid = false;
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
      isValid = false;
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
      isValid = false;
    }
    
    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
      isValid = false;
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }
    
    setPasswordErrors(errors);
    return isValid;
  };
  
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }
    
    try {
      // Call API to change password
      await ApiService.put('/users/change-password', {
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
      setProfileData(prev => ({ ...prev, profileImage: newProfileImage }));
      
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
      setProfileData(prev => ({ ...prev, profileImage: null }));
    } catch (error) {
      console.error('Error removing profile picture:', error);
      throw error;
    }
  };
  
  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotificationSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  const handleSaveNotifications = () => {
    // This would be an API call in a real app
    toast.success('Notification settings saved');
  };
  
  const handleOpenDeleteModal = () => {
    setIsDeleteModalOpen(true);
  };
  
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteConfirmation('');
  };
  
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    
    setIsDeleting(true);
    
    try {
      // This would be an API call in a real app
      setTimeout(() => {
        // Log out and redirect
        toast.success('Your account has been deleted');
        setIsDeleting(false);
        // In a real app, we would dispatch a logout action here
        navigate('/sign-in');
      }, 1500);
    } catch (error) {
      toast.error('Failed to delete account');
      setIsDeleting(false);
    }
  };
  
  return (
    <div className={styles.settingsContainer}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Account Settings</h1>
          <p>Manage your account preferences and security</p>
        </div>
      </div>
      
      {/* Profile Information Card */}
      <Card className={styles.profileCard}>
        <div className={styles.cardHeader}>
          <h2>Profile Information</h2>
          <p>Update your profile picture and basic information</p>
        </div>
        
        <div className={styles.profileSection}>
          <div className={styles.profilePictureSection}>
            <ProfilePictureUpload
              currentImage={profileData.profileImage ? FileService.getProfilePictureUrl(profileData.profileImage, user?._id || user?.id, true) : null}
              onUpload={handleProfilePictureUpload}
              onDelete={handleProfilePictureRemove}
              size="large"
            />
          </div>
          
          <div className={styles.profileInfo}>
            <div className={styles.infoItem}>
              <strong>Name:</strong> {profileData.firstName} {profileData.lastName}
            </div>
            <div className={styles.infoItem}>
              <strong>Email:</strong> {profileData.email}
            </div>
            <div className={styles.infoItem}>
              <strong>Role:</strong> Healthcare Provider
            </div>
          </div>
        </div>
      </Card>
      
      <Card className={styles.changePasswordCard}>
        <div className={styles.cardHeader}>
          <h2>Change Password</h2>
          <p>Update your password to maintain account security</p>
        </div>
        
        <form onSubmit={handlePasswordSubmit}>
          <div className={styles.formItem}>
            <Input
              label="Current Password"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              error={passwordErrors.currentPassword}
            />
          </div>
          
          <div className={styles.formItem}>
            <Input
              label="New Password"
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              error={passwordErrors.newPassword}
            />
          </div>
          
          <div className={styles.formItem}>
            <Input
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              error={passwordErrors.confirmPassword}
            />
          </div>
          
          <div className={styles.formActions}>
            <Button type="submit">Update Password</Button>
          </div>
        </form>
      </Card>
      
      <Card className={styles.notificationsCard}>
        <div className={styles.cardHeader}>
          <h2>Notification Settings</h2>
          <p>Control how you receive notifications</p>
        </div>
        
        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="emailNotifications"
              checked={notificationSettings.emailNotifications}
              onChange={handleNotificationChange}
            />
            <span>Receive email notifications</span>
          </label>
          
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="emailConsultationUpdates"
              checked={notificationSettings.emailConsultationUpdates}
              onChange={handleNotificationChange}
              disabled={!notificationSettings.emailNotifications}
            />
            <span>Consultation updates</span>
          </label>
          
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="emailPatientRequests"
              checked={notificationSettings.emailPatientRequests}
              onChange={handleNotificationChange}
              disabled={!notificationSettings.emailNotifications}
            />
            <span>Patient access requests</span>
          </label>
        </div>
        
        <div className={styles.formActions}>
          <Button onClick={handleSaveNotifications}>Save Preferences</Button>
        </div>
      </Card>
      
      <Card className={styles.dangerZoneCard}>
        <div className={styles.cardHeader}>
          <h2>Danger Zone</h2>
          <p>Permanent account actions</p>
        </div>
        
        <Alert type="warning" className={styles.deleteWarning}>
          <p>Deleting your account will remove all of your data from our system. This action cannot be undone.</p>
        </Alert>
        
        <div className={styles.formActions}>
          <Button 
            variant="danger" 
            onClick={handleOpenDeleteModal}
          >
            Delete Account
          </Button>
        </div>
      </Card>
      
      {/* Delete Account Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete Account"
      >
        <div className={styles.deleteModalContent}>
          <Alert type="error">
            <p>This action cannot be undone. All your data will be permanently deleted.</p>
          </Alert>
          
          <p>Please type <strong>DELETE</strong> to confirm:</p>
          
          <Input
            name="deleteConfirmation"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder="Type DELETE to confirm"
          />
          
          <div className={styles.modalActions}>
            <Button 
              variant="secondary" 
              onClick={handleCloseDeleteModal}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            
            <Button 
              variant="danger" 
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmation !== 'DELETE'}
            >
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Settings; 