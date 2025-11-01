import React, { useState, useEffect } from 'react';
import styles from './Profile.module.css';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import AuthService from '../../services/auth.service';
import ApiService from '../../services/api.service';
import { formatDate } from '../../utils/dateUtils';

// Component imports
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

// Create a user profile service
const UserProfileService = {
  // Get current user's profile
  getUserProfile: async () => {
    try {
      const response = await ApiService.get('/users/profile');
      return response;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  // Update user profile
  updateUserProfile: async (profileData) => {
    try {
      const response = await ApiService.put('/users/profile', profileData);
      return response;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
};

const PatientProfile = () => {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Get current user from Redux store
  const currentUser = useSelector(state => state.auth.user);

  useEffect(() => {
    // Fetch profile data from the API
    const fetchProfileData = async () => {
      setIsLoading(true);
      
      try {
        const userData = await UserProfileService.getUserProfile();
        
        // Helper function to format arrays as comma-separated strings
        const formatArrayField = (field) => {
          if (Array.isArray(field)) {
            return field.filter(item => item).join(', ') || '';
          }
          return field || '';
        };

        // Helper function to format address object
        const formatAddress = (address) => {
          if (typeof address === 'object' && address !== null) {
            const parts = [
              address.street,
              address.city,
              address.state,
              address.postalCode,
              address.country
            ].filter(part => part);
            return parts.join(', ') || '';
          }
          return address || '';
        };

        // Helper function to format boolean/string fields
        const formatBoolean = (value) => {
          if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
          }
          // If it's a string, keep it as is (since lifestyle data is stored as strings)
          return value || 'None';
        };

        // Map the user data to the profile structure needed by the UI
        const userProfile = {
          personalInfo: {
            title: userData.title || 'Mr.',
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            dateOfBirth: userData.patientProfile?.dateOfBirth || '',
            gender: userData.patientProfile?.gender || '',
            email: userData.email || '',
            phone: userData.phone || '',
            address: formatAddress(userData.patientProfile?.address)
          },
          insurance: {
            provider: userData.patientProfile?.insurance?.provider || '',
            plan: userData.patientProfile?.insurance?.plan || '',
            insuranceNumber: userData.patientProfile?.insurance?.insuranceNumber || '',
            emergencyContactName: userData.patientProfile?.emergencyContact?.name || '',
            emergencyContactNumber: userData.patientProfile?.emergencyContact?.phone || '',
            relationship: userData.patientProfile?.emergencyContact?.relationship || ''
          },
          medicalHistory: {
            chronicConditions: formatArrayField(userData.patientProfile?.medicalHistory?.chronicConditions),
            significantIllnesses: formatArrayField(userData.patientProfile?.medicalHistory?.significantIllnesses),
            mentalHealthHistory: formatArrayField(userData.patientProfile?.medicalHistory?.mentalHealthHistory)
          },
          familyHistory: {
            familyConditions: formatArrayField(userData.patientProfile?.familyMedicalHistory)
          },
          currentMedication: {
            medications: userData.patientProfile?.currentMedications && userData.patientProfile.currentMedications.length > 0
              ? userData.patientProfile.currentMedications.map(med => med.name).join(', ')
              : '',
            supplements: userData.patientProfile?.supplements || ''
          },
          allergies: {
            knownAllergies: formatArrayField(userData.patientProfile?.allergies)
          },
          lifestyle: {
            smoking: userData.patientProfile?.lifestyle?.smoking || 'None',
            alcohol: userData.patientProfile?.lifestyle?.alcohol || 'None',
            exercise: userData.patientProfile?.lifestyle?.exercise || 'None',
            dietaryPreferences: userData.patientProfile?.lifestyle?.dietaryPreferences || ''
          },
          immunisation: {
            vaccinations: formatArrayField(userData.patientProfile?.immunisationHistory)
          }
        };
        
        setProfile(userProfile);
        setEditedProfile(userProfile);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching profile data:', error);
        
        // Fallback to data from auth token if API fails
        if (currentUser) {
          const fallbackProfile = {
            personalInfo: {
              title: 'Mr./Ms.',
              firstName: currentUser.firstName || '',
              lastName: currentUser.lastName || '',
              dateOfBirth: '',
              gender: '',
              email: currentUser.email || '',
              phone: '',
              address: ''
            },
            insurance: {
              provider: '',
              plan: '',
              insuranceNumber: '',
              emergencyContactName: '',
              emergencyContactNumber: '',
              relationship: ''
            },
            medicalHistory: {
              chronicConditions: '',
              significantIllnesses: '',
              mentalHealthHistory: ''
            },
            familyHistory: {
              familyConditions: ''
            },
            currentMedication: {
              medications: '',
              supplements: ''
            },
            allergies: {
              knownAllergies: ''
            },
            lifestyle: {
              smoking: '',
              alcohol: '',
              exercise: '',
              dietaryPreferences: ''
            },
            immunisation: {
              vaccinations: ''
            }
          };
          
          setProfile(fallbackProfile);
          setEditedProfile(fallbackProfile);
        }
        
        toast.error('Failed to load your complete profile. Some data may be missing.');
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [currentUser]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Discard changes
      setEditedProfile(profile);
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (section, field, value) => {
    setEditedProfile({
      ...editedProfile,
      [section]: {
        ...editedProfile[section],
        [field]: value
      }
    });
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    
    try {
      // Helper function to parse comma-separated strings back to arrays
      const parseStringToArray = (str) => {
        if (!str) return [];
        return str.split(',').map(item => item.trim()).filter(item => item);
      };

      // Helper function to handle lifestyle fields (keep as strings)
      const parseLifestyleField = (value) => {
        // For lifestyle fields, we keep them as strings since that's how they're stored
        return value || '';
      };

      // Map the edited profile back to API format
      const updateData = {
        title: editedProfile.personalInfo.title,
        firstName: editedProfile.personalInfo.firstName,
        lastName: editedProfile.personalInfo.lastName,
        phone: editedProfile.personalInfo.phone,
        patientProfile: {
          dateOfBirth: editedProfile.personalInfo.dateOfBirth,
          gender: editedProfile.personalInfo.gender,
          address: {
            street: editedProfile.personalInfo.address,
            city: '',
            state: '',
            postalCode: '',
            country: ''
          },
          insurance: {
            provider: editedProfile.insurance.provider,
            plan: editedProfile.insurance.plan,
            insuranceNumber: editedProfile.insurance.insuranceNumber
          },
          emergencyContact: {
            name: editedProfile.insurance.emergencyContactName,
            phone: editedProfile.insurance.emergencyContactNumber,
            relationship: editedProfile.insurance.relationship
          },
          medicalHistory: {
            chronicConditions: parseStringToArray(editedProfile.medicalHistory.chronicConditions),
            significantIllnesses: parseStringToArray(editedProfile.medicalHistory.significantIllnesses),
            mentalHealthHistory: parseStringToArray(editedProfile.medicalHistory.mentalHealthHistory)
          },
          familyMedicalHistory: parseStringToArray(editedProfile.familyHistory.familyConditions),
          currentMedications: parseStringToArray(editedProfile.currentMedication.medications).map(med => ({
            name: med,
            dosage: '',
            frequency: ''
          })),
          supplements: editedProfile.currentMedication.supplements,
          allergies: parseStringToArray(editedProfile.allergies.knownAllergies),
          lifestyle: {
            smoking: parseLifestyleField(editedProfile.lifestyle.smoking),
            alcohol: parseLifestyleField(editedProfile.lifestyle.alcohol),
            exercise: parseLifestyleField(editedProfile.lifestyle.exercise),
            dietaryPreferences: parseLifestyleField(editedProfile.lifestyle.dietaryPreferences)
          },
          immunisationHistory: parseStringToArray(editedProfile.immunisation.vaccinations)
        }
      };
      
      // Update profile via API
      await UserProfileService.updateUserProfile(updateData);
      
      // Update profile with edited values
      setProfile(editedProfile);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Render a read-only field
  const renderField = (label, value) => (
    <div className={styles.field}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value || 'Not provided'}</div>
    </div>
  );

  // Render an editable field
  const renderEditableField = (section, field, label, value) => (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={`${section}-${field}`}>
        {label}
      </label>
      <input
        id={`${section}-${field}`}
        type="text"
        className={styles.input}
        value={value || ''}
        onChange={(e) => handleInputChange(section, field, e.target.value)}
      />
    </div>
  );

  if (isLoading) {
    return <div className={styles.loading}>Loading profile data...</div>;
  }

  if (!profile) {
    return <div className={styles.error}>Error loading profile. Please try again later.</div>;
  }

  return (
    <div className={styles.profileContainer}>
      <div className={styles.header}>
        <h1>My Profile</h1>
        <Button
          onClick={handleEditToggle}
          className={styles.editButton}
          variant={isEditing ? 'secondary' : 'primary'}
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      {/* Personal Information */}
      <Card className={styles.profileSection}>
        <h2>Personal Information</h2>
        <div className={styles.sectionContent}>
          {isEditing ? (
            <>
              {renderEditableField('personalInfo', 'title', 'Title', editedProfile.personalInfo.title)}
              {renderEditableField('personalInfo', 'firstName', 'First Name', editedProfile.personalInfo.firstName)}
              {renderEditableField('personalInfo', 'lastName', 'Last Name', editedProfile.personalInfo.lastName)}
              {renderEditableField('personalInfo', 'dateOfBirth', 'Date of Birth', editedProfile.personalInfo.dateOfBirth)}
              {renderEditableField('personalInfo', 'gender', 'Gender', editedProfile.personalInfo.gender)}
              {renderEditableField('personalInfo', 'phone', 'Phone Number', editedProfile.personalInfo.phone)}
              {renderEditableField('personalInfo', 'address', 'Address', editedProfile.personalInfo.address)}
            </>
          ) : (
            <>
              {renderField('Title', profile.personalInfo.title)}
              {renderField('Name', `${profile.personalInfo.firstName} ${profile.personalInfo.lastName}`)}
              {renderField('Date of Birth', profile.personalInfo.dateOfBirth ? formatDate(profile.personalInfo.dateOfBirth) : '')}
              {renderField('Gender', profile.personalInfo.gender)}
              {renderField('Email', profile.personalInfo.email)}
              {renderField('Phone', profile.personalInfo.phone)}
              {renderField('Address', profile.personalInfo.address)}
            </>
          )}
        </div>
      </Card>

      {/* Insurance Information */}
      <Card className={styles.profileSection}>
        <h2>Health Insurance</h2>
        <div className={styles.sectionContent}>
          {isEditing ? (
            <>
              {renderEditableField('insurance', 'provider', 'Insurance Provider', editedProfile.insurance.provider)}
              {renderEditableField('insurance', 'plan', 'Insurance Plan', editedProfile.insurance.plan)}
              {renderEditableField('insurance', 'insuranceNumber', 'Insurance Number', editedProfile.insurance.insuranceNumber)}
              {renderEditableField('insurance', 'emergencyContactName', 'Emergency Contact Name', editedProfile.insurance.emergencyContactName)}
              {renderEditableField('insurance', 'emergencyContactNumber', 'Emergency Contact Number', editedProfile.insurance.emergencyContactNumber)}
              {renderEditableField('insurance', 'relationship', 'Relationship', editedProfile.insurance.relationship)}
            </>
          ) : (
            <>
              {renderField('Insurance Provider', profile.insurance.provider)}
              {renderField('Insurance Plan', profile.insurance.plan)}
              {renderField('Insurance Number', profile.insurance.insuranceNumber)}
              {renderField('Emergency Contact', profile.insurance.emergencyContactName)}
              {renderField('Emergency Contact Number', profile.insurance.emergencyContactNumber)}
              {renderField('Relationship', profile.insurance.relationship)}
            </>
          )}
        </div>
      </Card>

      {/* Medical History */}
      <Card className={styles.profileSection}>
        <h2>Medical History</h2>
        <div className={styles.sectionContent}>
          {isEditing ? (
            <>
              {renderEditableField('medicalHistory', 'chronicConditions', 'Chronic Conditions', editedProfile.medicalHistory.chronicConditions)}
              {renderEditableField('medicalHistory', 'significantIllnesses', 'Significant Illnesses/Surgeries', editedProfile.medicalHistory.significantIllnesses)}
              {renderEditableField('medicalHistory', 'mentalHealthHistory', 'Mental Health History', editedProfile.medicalHistory.mentalHealthHistory)}
            </>
          ) : (
            <>
              {renderField('Chronic Conditions', profile.medicalHistory.chronicConditions)}
              {renderField('Significant Illnesses/Surgeries', profile.medicalHistory.significantIllnesses)}
              {renderField('Mental Health History', profile.medicalHistory.mentalHealthHistory)}
            </>
          )}
        </div>
      </Card>

      {/* Family Medical History */}
      <Card className={styles.profileSection}>
        <h2>Family Medical History</h2>
        <div className={styles.sectionContent}>
          {isEditing ? (
            <>
              {renderEditableField('familyHistory', 'familyConditions', 'Family Conditions', editedProfile.familyHistory.familyConditions)}
            </>
          ) : (
            <>
              {renderField('Family Conditions', profile.familyHistory.familyConditions)}
            </>
          )}
        </div>
      </Card>

      {/* Current Medications */}
      <Card className={styles.profileSection}>
        <h2>Current Medications</h2>
        <div className={styles.sectionContent}>
          {isEditing ? (
            <>
              {renderEditableField('currentMedication', 'medications', 'Medications', editedProfile.currentMedication.medications)}
              {renderEditableField('currentMedication', 'supplements', 'Supplements/Vitamins', editedProfile.currentMedication.supplements)}
            </>
          ) : (
            <>
              {renderField('Medications', profile.currentMedication.medications)}
              {renderField('Supplements/Vitamins', profile.currentMedication.supplements)}
            </>
          )}
        </div>
      </Card>

      {/* Allergies */}
      <Card className={styles.profileSection}>
        <h2>Allergies</h2>
        <div className={styles.sectionContent}>
          {isEditing ? (
            <>
              {renderEditableField('allergies', 'knownAllergies', 'Known Allergies', editedProfile.allergies.knownAllergies)}
            </>
          ) : (
            <>
              {renderField('Known Allergies', profile.allergies.knownAllergies)}
            </>
          )}
        </div>
      </Card>

      {/* Lifestyle & Habits */}
      <Card className={styles.profileSection}>
        <h2>Lifestyle & Habits</h2>
        <div className={styles.sectionContent}>
          {isEditing ? (
            <>
              {renderEditableField('lifestyle', 'smoking', 'Smoking', editedProfile.lifestyle.smoking)}
              {renderEditableField('lifestyle', 'alcohol', 'Alcohol', editedProfile.lifestyle.alcohol)}
              {renderEditableField('lifestyle', 'exercise', 'Exercise', editedProfile.lifestyle.exercise)}
              {renderEditableField('lifestyle', 'dietaryPreferences', 'Dietary Preferences', editedProfile.lifestyle.dietaryPreferences)}
            </>
          ) : (
            <>
              {renderField('Smoking', profile.lifestyle.smoking)}
              {renderField('Alcohol', profile.lifestyle.alcohol)}
              {renderField('Exercise', profile.lifestyle.exercise)}
              {renderField('Dietary Preferences', profile.lifestyle.dietaryPreferences)}
            </>
          )}
        </div>
      </Card>

      {/* Immunization */}
      <Card className={styles.profileSection}>
        <h2>Immunization</h2>
        <div className={styles.sectionContent}>
          {isEditing ? (
            <>
              {renderEditableField('immunisation', 'vaccinations', 'Vaccinations', editedProfile.immunisation.vaccinations)}
            </>
          ) : (
            <>
              {renderField('Vaccinations', profile.immunisation.vaccinations)}
            </>
          )}
        </div>
      </Card>

      {isEditing && (
        <div className={styles.actionButtons}>
          <Button 
            onClick={handleSaveProfile} 
            className={styles.saveButton}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PatientProfile; 