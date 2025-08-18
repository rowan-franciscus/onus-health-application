import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { updateUser, authSuccess } from '../../store/slices/authSlice';
import adminService from '../../services/admin.service';
import FileService from '../../services/file.service';
import UserProfileService from '../../services/userProfile.service';
import styles from './Settings.module.css';
import ProfilePictureUpload from '../../components/common/ProfilePictureUpload';

const SettingsSection = ({ title, children }) => (
  <div className={styles.settingsSection}>
    <h2>{title}</h2>
    <div className={styles.sectionContent}>{children}</div>
  </div>
);

const Settings = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    profileImage: null
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        profileImage: user.profileImage || null
      });
    }
  }, [user]);
  
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!profileForm.firstName || !profileForm.lastName) {
      toast.error('First name and last name are required');
      return;
    }
    
    try {
      setSaving(true);
      // Only send firstName and lastName, not email
      const updateData = {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName
      };
      const updatedProfile = await adminService.updateProfile(updateData);
      dispatch(updateUser(updatedProfile));
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };
  
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('All password fields are required');
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    
    try {
      setChangingPassword(true);
      await adminService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
      console.error(error);
    } finally {
      setChangingPassword(false);
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
      setProfileForm(prev => ({ ...prev, profileImage: newProfileImage }));
      
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
      setProfileForm(prev => ({ ...prev, profileImage: null }));
    } catch (error) {
      console.error('Error removing profile picture:', error);
      throw error;
    }
  };
  
  return (
    <div className={styles.settingsContainer}>
      <h1>Settings</h1>
      
      <SettingsSection title="Account Settings">
        <form onSubmit={handleSaveProfile} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="firstName">First Name</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={profileForm.firstName}
              onChange={handleProfileChange}
              className={styles.input}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="lastName">Last Name</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={profileForm.lastName}
              onChange={handleProfileChange}
              className={styles.input}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={profileForm.email}
              className={styles.input}
              disabled={true}
              readOnly={true}
              title="Email cannot be changed"
            />
            <small className={styles.fieldHint}>Email addresses cannot be changed for security reasons</small>
          </div>
          
          <div className={styles.formGroup}>
            <label>Profile Picture</label>
            <ProfilePictureUpload
              currentImage={profileForm.profileImage ? FileService.getProfilePictureUrl(profileForm.profileImage, user?._id || user?.id, true) : null}
              onUpload={handleProfilePictureUpload}
              onDelete={handleProfilePictureRemove}
              size="large"
            />
          </div>
          
          <button
            type="submit"
            className={styles.saveButton}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </SettingsSection>
      
      <SettingsSection title="Security">
        <form onSubmit={handleChangePassword} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="currentPassword">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              className={styles.input}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              className={styles.input}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              className={styles.input}
              required
            />
          </div>
          
          <button
            type="submit"
            className={styles.saveButton}
            disabled={changingPassword}
          >
            {changingPassword ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>
      </SettingsSection>
    </div>
  );
};

export default Settings; 