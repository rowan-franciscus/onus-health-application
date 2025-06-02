import React, { useState, useEffect } from 'react';
import styles from './ProviderPermissions.module.css';
import Card from '../common/Card';
import Button from '../common/Button';
import { toast } from 'react-toastify';
import ConnectionService from '../../services/connection.service';

const PermissionCheckbox = ({ label, checked, onChange, disabled }) => (
  <div className={styles.permissionItem}>
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span>{label}</span>
    </label>
  </div>
);

const ProviderPermissions = ({ connection, onClose, onUpdate }) => {
  const [permissions, setPermissions] = useState({
    viewConsultations: true,
    viewVitals: true,
    viewMedications: true,
    viewImmunizations: true,
    viewLabResults: true,
    viewRadiologyReports: true,
    viewHospitalRecords: true,
    viewSurgeryRecords: true
  });

  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize permissions from connection data
  useEffect(() => {
    if (connection?.permissions) {
      setPermissions(connection.permissions);
    }
  }, [connection]);

  const handlePermissionChange = (permission) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: !prev[permission]
    }));
  };

  const handleUpdatePermissions = async () => {
    if (!connection) return;
    
    setIsUpdating(true);
    
    try {
      await ConnectionService.updateConnection(connection._id, {
        status: 'approved',
        permissions
      });
      
      toast.success('Provider permissions updated successfully');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating provider permissions:', error);
      toast.error('Failed to update provider permissions. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!connection) return null;

  const { provider } = connection;

  return (
    <Card className={styles.permissionsCard}>
      <div className={styles.header}>
        <h2>Manage Provider Access</h2>
        <Button variant="secondary" className={styles.closeButton} onClick={onClose}>
          ✕
        </Button>
      </div>
      
      <div className={styles.providerInfo}>
        <h3>{provider.firstName} {provider.lastName}</h3>
        <p>Specialty: {provider.providerProfile?.specialty || 'Not specified'}</p>
        <p>Practice: {provider.providerProfile?.practiceName || 'Not specified'}</p>
      </div>
      
      <div className={styles.permissionsSection}>
        <h4>Data Access Permissions</h4>
        <p>Select which types of medical data this provider can access:</p>
        
        <div className={styles.permissionsList}>
          <PermissionCheckbox
            label="Consultations"
            checked={permissions.viewConsultations}
            onChange={() => handlePermissionChange('viewConsultations')}
            disabled={isUpdating}
          />
          <PermissionCheckbox
            label="Vitals"
            checked={permissions.viewVitals}
            onChange={() => handlePermissionChange('viewVitals')}
            disabled={isUpdating}
          />
          <PermissionCheckbox
            label="Medications"
            checked={permissions.viewMedications}
            onChange={() => handlePermissionChange('viewMedications')}
            disabled={isUpdating}
          />
          <PermissionCheckbox
            label="Immunizations"
            checked={permissions.viewImmunizations}
            onChange={() => handlePermissionChange('viewImmunizations')}
            disabled={isUpdating}
          />
          <PermissionCheckbox
            label="Lab Results"
            checked={permissions.viewLabResults}
            onChange={() => handlePermissionChange('viewLabResults')}
            disabled={isUpdating}
          />
          <PermissionCheckbox
            label="Radiology Reports"
            checked={permissions.viewRadiologyReports}
            onChange={() => handlePermissionChange('viewRadiologyReports')}
            disabled={isUpdating}
          />
          <PermissionCheckbox
            label="Hospital Records"
            checked={permissions.viewHospitalRecords}
            onChange={() => handlePermissionChange('viewHospitalRecords')}
            disabled={isUpdating}
          />
          <PermissionCheckbox
            label="Surgery Records"
            checked={permissions.viewSurgeryRecords}
            onChange={() => handlePermissionChange('viewSurgeryRecords')}
            disabled={isUpdating}
          />
        </div>
      </div>
      
      <div className={styles.actionButtons}>
        <Button 
          onClick={handleUpdatePermissions}
          disabled={isUpdating}
          className={styles.saveButton}
        >
          {isUpdating ? 'Saving...' : 'Save Permissions'}
        </Button>
        <Button 
          onClick={onClose}
          variant="secondary"
          className={styles.cancelButton}
          disabled={isUpdating}
        >
          Cancel
        </Button>
      </div>
    </Card>
  );
};

export default ProviderPermissions; 