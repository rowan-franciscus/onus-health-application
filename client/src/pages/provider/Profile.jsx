import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import styles from './Profile.module.css';
import ApiService from '../../services/api.service';
import FileService from '../../services/file.service';
import { updateUser } from '../../store/slices/authSlice';

// Component imports
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Profile = () => {
  const user = useSelector(state => state.auth.user);
  const dispatch = useDispatch();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    // Basic information
    title: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    
    // Professional information
    specialty: '',
    yearsOfExperience: '',
    practiceLicense: '',
    
    // Practice information
    practiceName: '',
    practiceLocation: '',
    practicePhone: '',
    practiceEmail: '',
    
    // Patient management
    averagePatients: '',
    collaboration: false,
    
    // Data preferences
    criticalInfo: '',
    historicalData: '',
    
    // Privacy practices
    privacyPractices: '',
    
    // Support preferences
    technicalSupport: '',
    training: '',
    updates: ''
  });
  
  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);
  
  const fetchProfileData = async () => {
    setIsLoading(true);
    try {
      const response = await ApiService.get('/provider/profile');
      
      if (response.success && response.provider) {
        const provider = response.provider;
        const providerProfile = provider.providerProfile || {};
        
        setProfileData({
          // Basic information
          title: provider.title || '',
          firstName: provider.firstName || '',
          lastName: provider.lastName || '',
          email: provider.email || '',
          phone: provider.phone || '',
          
          // Professional information  
          specialty: providerProfile.specialty || '',
          yearsOfExperience: providerProfile.yearsOfExperience || '',
          practiceLicense: providerProfile.practiceLicense || '',
          
          // Practice information
          practiceName: providerProfile.practiceInfo?.name || '',
          practiceLocation: providerProfile.practiceInfo?.location || '',
          practicePhone: providerProfile.practiceInfo?.phone || '',
          practiceEmail: providerProfile.practiceInfo?.email || '',
          
          // Patient management
          averagePatients: providerProfile.patientManagement?.averagePatients || '',
          collaboration: providerProfile.patientManagement?.collaboratesWithOthers || false,
          
          // Data preferences
          criticalInfo: Array.isArray(providerProfile.dataPreferences?.criticalInformation) 
            ? providerProfile.dataPreferences.criticalInformation.join(', ') 
            : providerProfile.dataPreferences?.criticalInformation || '',
          historicalData: providerProfile.dataPreferences?.requiresHistoricalData ? 'Yes' : 'No',
          
          // Privacy practices
          privacyPractices: providerProfile.dataPrivacyPractices || '',
          
          // Support preferences
          technicalSupport: providerProfile.supportPreferences?.technicalSupportPreference || '',
          training: providerProfile.supportPreferences?.requiresTraining || '',
          updates: providerProfile.supportPreferences?.updatePreference || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleEditClick = () => {
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    // Refetch data to reset any unsaved changes
    fetchProfileData();
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Prepare the data in the format expected by the backend
      const updateData = {
        title: profileData.title,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        providerProfile: {
          specialty: profileData.specialty,
          yearsOfExperience: parseInt(profileData.yearsOfExperience) || 0,
          practiceLicense: profileData.practiceLicense,
          practiceInfo: {
            name: profileData.practiceName,
            location: profileData.practiceLocation,
            phone: profileData.practicePhone,
            email: profileData.practiceEmail
          },
          patientManagement: {
            averagePatients: parseInt(profileData.averagePatients) || 0,
            collaboratesWithOthers: profileData.collaboration
          },
          dataPreferences: {
            criticalInformation: profileData.criticalInfo,
            requiresHistoricalData: profileData.historicalData === 'Yes'
          },
          dataPrivacyPractices: profileData.privacyPractices,
          supportPreferences: {
            technicalSupportPreference: profileData.technicalSupport,
            requiresTraining: profileData.training === 'Yes',
            updatePreference: profileData.updates
          }
        }
      };
      
      const response = await ApiService.put('/provider/profile', updateData);
      
      if (response.success) {
        toast.success('Profile updated successfully');
        setIsEditing(false);
        
        // Update Redux store with new user data
        dispatch(updateUser({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          title: profileData.title,
          phone: profileData.phone
        }));
        
        // Refresh the data to show latest changes
        await fetchProfileData();
      } else {
        toast.error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Helper function to display value or "-" if empty
  const displayValue = (value) => {
    if (isEditing) {
      return value;
    }
    return value && value.toString().trim() !== '' ? value : '-';
  };

  // Helper function to extract filename from license path
  const extractLicenseFilename = (licensePath) => {
    if (!licensePath || licensePath === '-') return null;
    // Extract filename from path like "/uploads/licenses/filename.pdf"
    const parts = licensePath.split('/');
    return parts[parts.length - 1];
  };

  // Helper function to handle license file viewing
  const handleViewLicense = () => {
    const filename = extractLicenseFilename(profileData.practiceLicense);
    if (filename) {
      try {
        FileService.viewFile('licenses', filename);
      } catch (error) {
        console.error('Error viewing license file:', error);
        toast.error('Unable to open license file');
      }
    }
  };

  // Render practice license field with view functionality
  const renderPracticeLicenseField = () => {
    const filename = extractLicenseFilename(profileData.practiceLicense);
    const hasLicense = filename && profileData.practiceLicense !== '-';
    
    if (isEditing) {
      // In edit mode, show as regular input
      return (
        <Input
          label="Practice License"
          name="practiceLicense"
          value={displayValue(profileData.practiceLicense)}
          onChange={handleInputChange}
          disabled={!isEditing}
          readOnly={!isEditing}
        />
      );
    }
    
    // In view mode, show custom license field with view option
    return (
      <div className={styles.licenseField}>
        <label className={styles.licenseLabel}>Practice License</label>
        <div className={styles.licenseContent}>
          <div className={styles.licenseInfo}>
            {hasLicense ? (
              <>
                <span className={styles.licenseFilename}>{filename}</span>
                <Button
                  type="button"
                  onClick={handleViewLicense}
                  className={styles.viewLicenseButton}
                  size="small"
                >
                  View License
                </Button>
              </>
            ) : (
              <span className={styles.noLicense}>-</span>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
        <p>Loading profile data...</p>
      </div>
    );
  }
  
  return (
    <div className={styles.profileContainer}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Provider Profile</h1>
          <p>View and manage your professional information</p>
        </div>
        {!isEditing && (
          <div className={styles.headerActions}>
            <Button 
              onClick={handleEditClick}
              className={styles.editButton}
            >
              Edit Profile
            </Button>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className={styles.contentGrid}>
          <Card className={styles.basicInfoCard}>
            <div className={styles.cardHeader}>
              <h2>Basic Information</h2>
            </div>
            
            <div className={styles.formRow}>
              <Input
                label="Title"
                name="title"
                value={displayValue(profileData.title)}
                onChange={handleInputChange}
                disabled={!isEditing}
                readOnly={!isEditing}
              />
              
              <Input
                label="First Name"
                name="firstName"
                value={displayValue(profileData.firstName)}
                onChange={handleInputChange}
                required={isEditing}
                disabled={!isEditing}
                readOnly={!isEditing}
              />
              
              <Input
                label="Last Name"
                name="lastName"
                value={displayValue(profileData.lastName)}
                onChange={handleInputChange}
                required={isEditing}
                disabled={!isEditing}
                readOnly={!isEditing}
              />
            </div>
            
            <div className={styles.formRow}>
              <Input
                label="Email"
                name="email"
                type="email"
                value={displayValue(profileData.email)}
                onChange={handleInputChange}
                required={isEditing}
                disabled={true}
                readOnly={true}
              />
              
              <Input
                label="Phone Number"
                name="phone"
                value={displayValue(profileData.phone)}
                onChange={handleInputChange}
                disabled={!isEditing}
                readOnly={!isEditing}
              />
            </div>
          </Card>
          
          <Card className={styles.professionalInfoCard}>
            <div className={styles.cardHeader}>
              <h2>Professional Information</h2>
            </div>
            
            <div className={styles.formRow}>
              <Input
                label="Medical Specialty"
                name="specialty"
                value={displayValue(profileData.specialty)}
                onChange={handleInputChange}
                required={isEditing}
                disabled={!isEditing}
                readOnly={!isEditing}
              />
              
              <Input
                label="Years of Experience"
                name="yearsOfExperience"
                type="number"
                value={displayValue(profileData.yearsOfExperience)}
                onChange={handleInputChange}
                min="0"
                disabled={!isEditing}
                readOnly={!isEditing}
              />
            </div>
            
            {renderPracticeLicenseField()}
          </Card>
          
          <Card className={styles.practiceInfoCard}>
            <div className={styles.cardHeader}>
              <h2>Practice Information</h2>
            </div>
            
            <div className={styles.formRow}>
              <Input
                label="Practice Name"
                name="practiceName"
                value={displayValue(profileData.practiceName)}
                onChange={handleInputChange}
                disabled={!isEditing}
                readOnly={!isEditing}
              />
            </div>
            
            <Textarea
              label="Practice Location"
              name="practiceLocation"
              value={displayValue(profileData.practiceLocation)}
              onChange={handleInputChange}
              rows={3}
              disabled={!isEditing}
              readOnly={!isEditing}
            />
            
            <div className={styles.formRow}>
              <Input
                label="Practice Phone"
                name="practicePhone"
                value={displayValue(profileData.practicePhone)}
                onChange={handleInputChange}
                disabled={!isEditing}
                readOnly={!isEditing}
              />
              
              <Input
                label="Practice Email"
                name="practiceEmail"
                type="email"
                value={displayValue(profileData.practiceEmail)}
                onChange={handleInputChange}
                disabled={!isEditing}
                readOnly={!isEditing}
              />
            </div>
          </Card>
          
          <Card className={styles.managementInfoCard}>
            <div className={styles.cardHeader}>
              <h2>Patient Management & Preferences</h2>
            </div>
            
            <div className={styles.formRow}>
              <Input
                label="Average Patients Per Week"
                name="averagePatients"
                type="number"
                value={displayValue(profileData.averagePatients)}
                onChange={handleInputChange}
                min="0"
                disabled={!isEditing}
                readOnly={!isEditing}
              />
            </div>
            
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="collaboration"
                  checked={profileData.collaboration}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
                I collaborate with other specialists or departments
              </label>
            </div>
            
            <Textarea
              label="Critical Patient Information"
              name="criticalInfo"
              value={displayValue(profileData.criticalInfo)}
              onChange={handleInputChange}
              rows={4}
              disabled={!isEditing}
              readOnly={!isEditing}
            />
            
            <Textarea
              label="Historical Data Requirements"
              name="historicalData"
              value={displayValue(profileData.historicalData)}
              onChange={handleInputChange}
              rows={4}
              disabled={!isEditing}
              readOnly={!isEditing}
            />
            
            <Textarea
              label="Privacy Practices"
              name="privacyPractices"
              value={displayValue(profileData.privacyPractices)}
              onChange={handleInputChange}
              rows={4}
              disabled={!isEditing}
              readOnly={!isEditing}
            />
          </Card>
          
          <Card className={styles.supportInfoCard}>
            <div className={styles.cardHeader}>
              <h2>Support & Communication Preferences</h2>
            </div>
            
            <Input
              label="Technical Support Preference"
              name="technicalSupport"
              value={displayValue(profileData.technicalSupport)}
              onChange={handleInputChange}
              disabled={!isEditing}
              readOnly={!isEditing}
            />
            
            <Input
              label="Training Requirements"
              name="training"
              value={displayValue(profileData.training)}
              onChange={handleInputChange}
              disabled={!isEditing}
              readOnly={!isEditing}
            />
            
            <Input
              label="Update Preferences"
              name="updates"
              value={displayValue(profileData.updates)}
              onChange={handleInputChange}
              disabled={!isEditing}
              readOnly={!isEditing}
            />
          </Card>
        </div>
        
        {isEditing && (
          <div className={styles.formActions}>
            <Button 
              type="button"
              onClick={handleCancelEdit}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className={styles.saveButton}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Profile; 