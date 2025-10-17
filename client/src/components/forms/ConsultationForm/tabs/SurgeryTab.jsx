import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { formatDate } from '../../../../utils/dateUtils';
import styles from './FormTabs.module.css';

const SurgeryTab = ({
  surgeryRecords,
  errors,
  touched,
  setFieldValue
}) => {
  const [newRecord, setNewRecord] = useState({
    type: '',
    date: '',
    reason: '',
    complications: '',
    recoveryNotes: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  
  const validateRecord = (record) => {
    const errors = {};
    
    if (!record.type.trim()) {
      errors.type = 'Surgery type is required';
    }
    
    if (!record.date) {
      errors.date = 'Surgery date is required';
    }
    
    if (!record.reason.trim()) {
      errors.reason = 'Reason for surgery is required';
    }
    
    return errors;
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRecord(prev => ({
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
  
  const handleAddRecord = () => {
    const validationErrors = validateRecord(newRecord);
    
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }
    
    // Add the new record to the list
    const updatedRecords = [...surgeryRecords, newRecord];
    setFieldValue('surgery', updatedRecords);
    
    // Reset the form for the next record
    setNewRecord({
      type: '',
      date: '',
      reason: '',
      complications: '',
      recoveryNotes: ''
    });
    
    setFormErrors({});
  };
  
  const handleDeleteRecord = (index) => {
    const updatedRecords = surgeryRecords.filter((_, i) => i !== index);
    setFieldValue('surgery', updatedRecords);
  };
  
  return (
    <div className={styles.tabContainer}>
      <h2 className={styles.tabTitle}>Surgery Records</h2>
      <p className={styles.tabDescription}>
        Add surgery records for this consultation
      </p>
      
      {surgeryRecords.length > 0 && (
        <div className={styles.recordsList}>
          {surgeryRecords.map((record, index) => (
            <div key={index} className={styles.fieldGroup}>
              <div className={styles.fieldGroupHeader}>
                <h3 className={styles.fieldGroupTitle}>
                  {record.type} - {formatDate(record.date)}
                </h3>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => handleDeleteRecord(index)}
                >
                  Remove
                </button>
              </div>
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Surgery Type</label>
                  <p className={styles.formValue}>{record.type}</p>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Date</label>
                  <p className={styles.formValue}>{formatDate(record.date)}</p>
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Reason</label>
                <p className={styles.formValue}>{record.reason}</p>
              </div>
              
              {record.complications && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Complications</label>
                  <p className={styles.formValue}>{record.complications}</p>
                </div>
              )}
              
              {record.recoveryNotes && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Recovery Notes</label>
                  <p className={styles.formValue}>{record.recoveryNotes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className={styles.fieldGroup}>
        <h3 className={styles.fieldGroupTitle}>Add New Surgery Record</h3>
        
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="type" className={styles.formLabel}>
              Surgery Type <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="type"
              name="type"
              value={newRecord.type}
              onChange={handleInputChange}
              placeholder="Enter surgery type"
              className={classNames(
                styles.formInput,
                formErrors.type ? styles.inputError : ''
              )}
            />
            {formErrors.type && (
              <div className={styles.errorMessage}>{formErrors.type}</div>
            )}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="date" className={styles.formLabel}>
              Date <span className={styles.required}>*</span>
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={newRecord.date}
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
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="reason" className={styles.formLabel}>
            Reason <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="reason"
            name="reason"
            value={newRecord.reason}
            onChange={handleInputChange}
            placeholder="Enter reason for surgery"
            className={classNames(
              styles.formInput,
              formErrors.reason ? styles.inputError : ''
            )}
          />
          {formErrors.reason && (
            <div className={styles.errorMessage}>{formErrors.reason}</div>
          )}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="complications" className={styles.formLabel}>
            Complications
          </label>
          <textarea
            id="complications"
            name="complications"
            value={newRecord.complications}
            onChange={handleInputChange}
            placeholder="Enter any complications that occurred"
            className={styles.textarea}
            rows={3}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="recoveryNotes" className={styles.formLabel}>
            Recovery Notes
          </label>
          <textarea
            id="recoveryNotes"
            name="recoveryNotes"
            value={newRecord.recoveryNotes}
            onChange={handleInputChange}
            placeholder="Enter recovery notes and instructions"
            className={styles.textarea}
            rows={3}
          />
        </div>
        
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.addItemButton}
            onClick={handleAddRecord}
          >
            Add Surgery Record
          </button>
        </div>
      </div>
      
      {surgeryRecords.length === 0 && (
        <div className={styles.noDataMessage}>
          No surgery records added yet. Use the form above to add records.
        </div>
      )}
    </div>
  );
};

SurgeryTab.propTypes = {
  surgeryRecords: PropTypes.array.isRequired,
  errors: PropTypes.object,
  touched: PropTypes.object,
  setFieldValue: PropTypes.func.isRequired
};

export default SurgeryTab; 