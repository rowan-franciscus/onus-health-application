import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import styles from './Profile.module.css';

// Component imports
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Profile = () => {
  const user = useSelector(state => state.auth.user);
  const dispatch = useDispatch();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialty: '',
    practiceName: '',
    practiceAddress: '',
    yearsOfExperience: ''
  });
  
  useEffect(() => {
    // Load profile data
    if (user) {
      fetchProfileData();
    }
  }, [user]);
  
  const fetchProfileData = async () => {
    setIsLoading(true);
    try {
      // This would be an API call in a real application
      // For now, we'll simulate loading the data
      setTimeout(() => {
        setProfileData({
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: user?.email || '',
          phone: user?.phone || '',
          specialty: user?.specialty || '',
          practiceName: user?.practice?.name || '',
          practiceAddress: user?.practice?.address || '',
          yearsOfExperience: user?.yearsOfExperience || ''
        });
        setIsLoading(false);
      }, 800);
    } catch (error) {
      toast.error('Failed to load profile data');
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // This would be an API call in a real application
      // For now, we'll simulate saving the data
      setTimeout(() => {
        toast.success('Profile updated successfully');
        setIsSubmitting(false);
      }, 1000);
    } catch (error) {
      toast.error('Failed to update profile');
      setIsSubmitting(false);
    }
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
          <p>Manage your professional information</p>
        </div>
      </div>
      
      <div className={styles.contentGrid}>
        <Card className={styles.basicInfoCard}>
          <div className={styles.cardHeader}>
            <h2>Basic Information</h2>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className={styles.formRow}>
              <Input
                label="First Name"
                name="firstName"
                value={profileData.firstName}
                onChange={handleInputChange}
                required
              />
              
              <Input
                label="Last Name"
                name="lastName"
                value={profileData.lastName}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className={styles.formRow}>
              <Input
                label="Email"
                name="email"
                type="email"
                value={profileData.email}
                onChange={handleInputChange}
                required
                disabled
              />
              
              <Input
                label="Phone Number"
                name="phone"
                value={profileData.phone}
                onChange={handleInputChange}
              />
            </div>
            
            <div className={styles.formActions}>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>
        
        <Card className={styles.practiceInfoCard}>
          <div className={styles.cardHeader}>
            <h2>Practice Information</h2>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className={styles.formRow}>
              <Input
                label="Medical Specialty"
                name="specialty"
                value={profileData.specialty}
                onChange={handleInputChange}
                required
              />
              
              <Input
                label="Years of Experience"
                name="yearsOfExperience"
                type="number"
                value={profileData.yearsOfExperience}
                onChange={handleInputChange}
                min="0"
              />
            </div>
            
            <div className={styles.formRow}>
              <Input
                label="Practice Name"
                name="practiceName"
                value={profileData.practiceName}
                onChange={handleInputChange}
              />
            </div>
            
            <div className={styles.formRow}>
              <Input
                label="Practice Address"
                name="practiceAddress"
                value={profileData.practiceAddress}
                onChange={handleInputChange}
              />
            </div>
            
            <div className={styles.formActions}>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Profile; 