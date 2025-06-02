import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './FormTabs.module.css';

const MedicationTab = ({
  medications,
  errors,
  touched,
  setFieldValue
}) => {
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: {
      value: '',
      unit: ''
    },
    frequency: '',
    reason: '',
    startDate: '',
    endDate: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  
  const validateMedication = (medication) => {
    const errors = {};
    
    if (!medication.name.trim()) {
      errors.name = 'Medication name is required';
    }
    
    if (!medication.dosage.value.trim()) {
      errors.dosageValue = 'Dosage value is required';
    }
    
    if (!medication.dosage.unit.trim()) {
      errors.dosageUnit = 'Dosage unit is required';
    }
    
    if (!medication.frequency.trim()) {
      errors.frequency = 'Frequency is required';
    }
    
    if (!medication.startDate) {
      errors.startDate = 'Start date is required';
    }
    
    if (medication.endDate && new Date(medication.endDate) < new Date(medication.startDate)) {
      errors.endDate = 'End date cannot be before start date';
    }
    
    return errors;
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'dosageValue' || name === 'dosageUnit') {
      const dosageField = name === 'dosageValue' ? 'value' : 'unit';
      setNewMedication(prev => ({
        ...prev,
        dosage: {
          ...prev.dosage,
          [dosageField]: value
        }
      }));
      
      // Clear errors when typing
      if (formErrors[name]) {
        setFormErrors(prev => ({
          ...prev,
          [name]: undefined
        }));
      }
    } else {
      setNewMedication(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Clear errors when typing
      if (formErrors[name]) {
        setFormErrors(prev => ({
          ...prev,
          [name]: undefined
        }));
      }
    }
  };
  
  const handleAddMedication = () => {
    const validationErrors = validateMedication(newMedication);
    
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }
    
    // Add the new medication to the list
    const updatedMedications = [...medications, newMedication];
    setFieldValue('medication', updatedMedications);
    
    // Reset the form for the next medication
    setNewMedication({
      name: '',
      dosage: {
        value: '',
        unit: ''
      },
      frequency: '',
      reason: '',
      startDate: '',
      endDate: ''
    });
    
    setFormErrors({});
  };
  
  const handleDeleteMedication = (index) => {
    const updatedMedications = medications.filter((_, i) => i !== index);
    setFieldValue('medication', updatedMedications);
  };
  
  return (
    <div className={styles.tabContainer}>
      <h2 className={styles.tabTitle}>Medications</h2>
      <p className={styles.tabDescription}>
        Add medications prescribed during this consultation
      </p>
      
      {medications.length > 0 && (
        <div className={styles.medicationsList}>
          {medications.map((medication, index) => (
            <div key={index} className={styles.fieldGroup}>
              <div className={styles.fieldGroupHeader}>
                <h3 className={styles.fieldGroupTitle}>
                  {medication.name} - {
                    typeof medication.dosage === 'object' 
                      ? `${medication.dosage.value}${medication.dosage.unit}` 
                      : medication.dosage || ''
                  }
                </h3>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => handleDeleteMedication(index)}
                >
                  Remove
                </button>
              </div>
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Name</label>
                  <p className={styles.formValue}>{medication.name}</p>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Dosage</label>
                  <p className={styles.formValue}>
                    {typeof medication.dosage === 'object' 
                      ? `${medication.dosage.value}${medication.dosage.unit}` 
                      : medication.dosage || ''}
                  </p>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Frequency</label>
                  <p className={styles.formValue}>{medication.frequency}</p>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Reason</label>
                  <p className={styles.formValue}>{medication.reason || 'Not specified'}</p>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Start Date</label>
                  <p className={styles.formValue}>{new Date(medication.startDate).toLocaleDateString()}</p>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>End Date</label>
                  <p className={styles.formValue}>
                    {medication.endDate ? new Date(medication.endDate).toLocaleDateString() : 'Ongoing'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className={styles.fieldGroup}>
        <h3 className={styles.fieldGroupTitle}>Add New Medication</h3>
        
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.formLabel}>
              Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={newMedication.name}
              onChange={handleInputChange}
              placeholder="Enter medication name"
              className={classNames(
                styles.formInput,
                formErrors.name ? styles.inputError : ''
              )}
            />
            {formErrors.name && (
              <div className={styles.errorMessage}>{formErrors.name}</div>
            )}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="dosageValue" className={styles.formLabel}>
              Dosage Value <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="dosageValue"
              name="dosageValue"
              value={newMedication.dosage.value}
              onChange={handleInputChange}
              placeholder="Enter dosage value (e.g., 500)"
              className={classNames(
                styles.formInput,
                formErrors.dosageValue ? styles.inputError : ''
              )}
            />
            {formErrors.dosageValue && (
              <div className={styles.errorMessage}>{formErrors.dosageValue}</div>
            )}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="dosageUnit" className={styles.formLabel}>
              Dosage Unit <span className={styles.required}>*</span>
            </label>
            <select
              id="dosageUnit"
              name="dosageUnit"
              value={newMedication.dosage.unit}
              onChange={handleInputChange}
              className={classNames(
                styles.formInput,
                formErrors.dosageUnit ? styles.inputError : ''
              )}
            >
              <option value="">Select unit</option>
              <option value="mg">mg</option>
              <option value="g">g</option>
              <option value="ml">ml</option>
              <option value="units">units</option>
              <option value="tablets">tablets</option>
              <option value="capsules">capsules</option>
              <option value="drops">drops</option>
            </select>
            {formErrors.dosageUnit && (
              <div className={styles.errorMessage}>{formErrors.dosageUnit}</div>
            )}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="frequency" className={styles.formLabel}>
              Frequency <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="frequency"
              name="frequency"
              value={newMedication.frequency}
              onChange={handleInputChange}
              placeholder="Enter frequency (e.g., twice daily)"
              className={classNames(
                styles.formInput,
                formErrors.frequency ? styles.inputError : ''
              )}
            />
            {formErrors.frequency && (
              <div className={styles.errorMessage}>{formErrors.frequency}</div>
            )}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="reason" className={styles.formLabel}>
              Reason for Prescription
            </label>
            <input
              type="text"
              id="reason"
              name="reason"
              value={newMedication.reason}
              onChange={handleInputChange}
              placeholder="Enter reason for prescription"
              className={styles.formInput}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="startDate" className={styles.formLabel}>
              Start Date <span className={styles.required}>*</span>
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={newMedication.startDate}
              onChange={handleInputChange}
              className={classNames(
                styles.formInput,
                formErrors.startDate ? styles.inputError : ''
              )}
            />
            {formErrors.startDate && (
              <div className={styles.errorMessage}>{formErrors.startDate}</div>
            )}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="endDate" className={styles.formLabel}>
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={newMedication.endDate}
              onChange={handleInputChange}
              className={classNames(
                styles.formInput,
                formErrors.endDate ? styles.inputError : ''
              )}
            />
            {formErrors.endDate && (
              <div className={styles.errorMessage}>{formErrors.endDate}</div>
            )}
          </div>
        </div>
        
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.addItemButton}
            onClick={handleAddMedication}
          >
            Add Medication
          </button>
        </div>
      </div>
      
      {medications.length === 0 && (
        <div className={styles.noDataMessage}>
          No medications added yet. Use the form above to add medications.
        </div>
      )}
    </div>
  );
};

MedicationTab.propTypes = {
  medications: PropTypes.array.isRequired,
  errors: PropTypes.object,
  touched: PropTypes.object,
  setFieldValue: PropTypes.func.isRequired
};

export default MedicationTab; 