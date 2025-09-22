import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Select from '../../components/common/Select/Select';
import LoadingIndicator from '../../components/common/LoadingIndicator/LoadingIndicator';
import { FaArrowLeft } from 'react-icons/fa';
import adminService from '../../services/admin.service';
import styles from './EditPatient.module.css';

const EditPatient = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    phone: '',
    address: '',
    insurance: {
      provider: '',
      plan: '',
      number: '',
    },
    emergencyContact: {
      name: '',
      phone: '',
      relationship: '',
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await adminService.getUserById(id);
        
        // Initialize form data with patient data
        setFormData({
          title: data.title || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '',
          gender: data.gender || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          insurance: {
            provider: data.insurance?.provider || '',
            plan: data.insurance?.plan || '',
            number: data.insurance?.number || '',
          },
          emergencyContact: {
            name: data.emergencyContact?.name || '',
            phone: data.emergencyContact?.phone || '',
            relationship: data.emergencyContact?.relationship || '',
          },
        });
      } catch (err) {
        setError('Failed to load patient details. Please try again.');
        console.error('Error fetching patient:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatient();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested properties
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage('');
      
      await adminService.updateUser(id, formData);
      setSuccessMessage('Patient updated successfully');
      
      // Navigate back after a brief delay
      setTimeout(() => {
        navigate(`/admin/patients/${id}`);
      }, 1500);
    } catch (err) {
      setError('Failed to update patient. Please try again.');
      console.error('Error updating patient:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !formData.firstName) {
    return <LoadingIndicator />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to={`/admin/patients/${id}`} className={styles.backLink}>
          <FaArrowLeft /> Back to Patient Details
        </Link>
        <h1>Edit Patient</h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {successMessage && <div className={styles.success}>{successMessage}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Personal Information</h2>
          <div className={styles.grid}>
            <Select
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              options={[
                { value: '', label: '-- Select Title --' },
                { value: 'Mr', label: 'Mr' },
                { value: 'Mrs', label: 'Mrs' },
                { value: 'Ms', label: 'Ms' },
                { value: 'Dr', label: 'Dr' },
              ]}
            />
            <Input
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
            <Input
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
            <Input
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
              required
            />
            <Select
              label="Gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              options={[
                { value: '', label: '-- Select Gender --' },
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' },
                { value: 'Prefer not to say', label: 'Prefer not to say' },
              ]}
              required
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
            <Input
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className={styles.fullWidth}
            />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Health Insurance</h2>
          <div className={styles.grid}>
            <Input
              label="Insurance Provider"
              name="insurance.provider"
              value={formData.insurance.provider}
              onChange={handleChange}
            />
            <Input
              label="Insurance Plan"
              name="insurance.plan"
              value={formData.insurance.plan}
              onChange={handleChange}
            />
            <Input
              label="Insurance Number"
              name="insurance.number"
              value={formData.insurance.number}
              onChange={handleChange}
            />
            <Input
              label="Emergency Contact Name"
              name="emergencyContact.name"
              value={formData.emergencyContact.name}
              onChange={handleChange}
            />
            <Input
              label="Emergency Contact Number"
              name="emergencyContact.phone"
              value={formData.emergencyContact.phone}
              onChange={handleChange}
            />
            <Input
              label="Emergency Contact Relationship"
              name="emergencyContact.relationship"
              value={formData.emergencyContact.relationship}
              onChange={handleChange}
            />
          </div>
        </section>

        <div className={styles.buttonGroup}>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => navigate(`/admin/patients/${id}`)}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditPatient; 