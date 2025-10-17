import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { formatDate } from '../../../../utils/dateUtils';
import styles from './FormTabs.module.css';

const ImmunizationTab = ({
  immunizations,
  errors,
  touched,
  setFieldValue
}) => {
  const [newImmunization, setNewImmunization] = useState({
    name: '',
    date: '',
    serialNumber: '',
    nextDueDate: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  
  const validateImmunization = (immunization) => {
    const errors = {};
    
    if (!immunization.name.trim()) {
      errors.name = 'Vaccine name is required';
    }
    
    if (!immunization.date) {
      errors.date = 'Date administered is required';
    }
    
    if (immunization.nextDueDate && new Date(immunization.nextDueDate) < new Date(immunization.date)) {
      errors.nextDueDate = 'Next due date cannot be before administered date';
    }
    
    return errors;
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewImmunization(prev => ({
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
  };
  
  const handleAddImmunization = () => {
    const validationErrors = validateImmunization(newImmunization);
    
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }
    
    // Add the new immunization to the list
    const updatedImmunizations = [...immunizations, newImmunization];
    setFieldValue('immunization', updatedImmunizations);
    
    // Reset the form for the next immunization
    setNewImmunization({
      name: '',
      date: '',
      serialNumber: '',
      nextDueDate: ''
    });
    
    setFormErrors({});
  };
  
  const handleDeleteImmunization = (index) => {
    const updatedImmunizations = immunizations.filter((_, i) => i !== index);
    setFieldValue('immunization', updatedImmunizations);
  };
  
  return (
    <div className={styles.tabContainer}>
      <h2 className={styles.tabTitle}>Immunizations</h2>
      <p className={styles.tabDescription}>
        Add immunizations administered during this consultation
      </p>
      
      {immunizations.length > 0 && (
        <div className={styles.immunizationsList}>
          {immunizations.map((immunization, index) => (
            <div key={index} className={styles.fieldGroup}>
              <div className={styles.fieldGroupHeader}>
                <h3 className={styles.fieldGroupTitle}>
                  {immunization.name}
                </h3>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => handleDeleteImmunization(index)}
                >
                  Remove
                </button>
              </div>
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Vaccine Name</label>
                  <p className={styles.formValue}>{immunization.name}</p>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Date Administered</label>
                  <p className={styles.formValue}>{formatDate(immunization.date)}</p>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Serial Number</label>
                  <p className={styles.formValue}>{immunization.serialNumber || 'Not specified'}</p>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Next Due Date</label>
                  <p className={styles.formValue}>
                    {immunization.nextDueDate ? formatDate(immunization.nextDueDate) : 'Not applicable'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className={styles.fieldGroup}>
        <h3 className={styles.fieldGroupTitle}>Add New Immunization</h3>
        
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.formLabel}>
              Vaccine Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={newImmunization.name}
              onChange={handleInputChange}
              placeholder="Enter vaccine name"
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
            <label htmlFor="date" className={styles.formLabel}>
              Date Administered <span className={styles.required}>*</span>
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={newImmunization.date}
              onChange={handleInputChange}
              className={classNames(
                styles.formInput,
                formErrors.date ? styles.inputError : ''
              )}
            />
            {formErrors.date && (
              <div className={styles.errorMessage}>{formErrors.date}</div>
            )}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="serialNumber" className={styles.formLabel}>
              Vaccine Serial Number
            </label>
            <input
              type="text"
              id="serialNumber"
              name="serialNumber"
              value={newImmunization.serialNumber}
              onChange={handleInputChange}
              placeholder="Enter vaccine serial number"
              className={styles.formInput}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="nextDueDate" className={styles.formLabel}>
              Next Due Date
            </label>
            <input
              type="date"
              id="nextDueDate"
              name="nextDueDate"
              value={newImmunization.nextDueDate}
              onChange={handleInputChange}
              className={classNames(
                styles.formInput,
                formErrors.nextDueDate ? styles.inputError : ''
              )}
            />
            {formErrors.nextDueDate && (
              <div className={styles.errorMessage}>{formErrors.nextDueDate}</div>
            )}
          </div>
        </div>
        
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.addItemButton}
            onClick={handleAddImmunization}
          >
            Add Immunization
          </button>
        </div>
      </div>
      
      {immunizations.length === 0 && (
        <div className={styles.noDataMessage}>
          No immunizations added yet. Use the form above to add immunizations.
        </div>
      )}
    </div>
  );
};

ImmunizationTab.propTypes = {
  immunizations: PropTypes.array.isRequired,
  errors: PropTypes.object,
  touched: PropTypes.object,
  setFieldValue: PropTypes.func.isRequired
};

export default ImmunizationTab; 