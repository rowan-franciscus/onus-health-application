import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { formatDate } from '../../../../utils/dateUtils';
import styles from './FormTabs.module.css';

const HospitalTab = ({
  hospitalRecords,
  errors,
  touched,
  setFieldValue
}) => {
  const [newRecord, setNewRecord] = useState({
    hospitalName: '',
    admissionDate: '',
    dischargeDate: '',
    reason: '',
    treatments: '',
    attendingDoctors: '',
    dischargeSummary: '',
    investigations: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  
  const validateRecord = (record) => {
    const errors = {};
    
    if (!record.hospitalName.trim()) {
      errors.hospitalName = 'Hospital name is required';
    }
    
    if (!record.admissionDate) {
      errors.admissionDate = 'Admission date is required';
    }
    
    if (!record.reason.trim()) {
      errors.reason = 'Reason for hospitalization is required';
    }
    
    if (record.dischargeDate && new Date(record.dischargeDate) < new Date(record.admissionDate)) {
      errors.dischargeDate = 'Discharge date cannot be before admission date';
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
    const updatedRecords = [...hospitalRecords, newRecord];
    setFieldValue('hospital', updatedRecords);
    
    // Reset the form for the next record
    setNewRecord({
      hospitalName: '',
      admissionDate: '',
      dischargeDate: '',
      reason: '',
      treatments: '',
      attendingDoctors: '',
      dischargeSummary: '',
      investigations: ''
    });
    
    setFormErrors({});
  };
  
  const handleDeleteRecord = (index) => {
    const updatedRecords = hospitalRecords.filter((_, i) => i !== index);
    setFieldValue('hospital', updatedRecords);
  };
  
  return (
    <div className={styles.tabContainer}>
      <h2 className={styles.tabTitle}>Hospital Records</h2>
      <p className={styles.tabDescription}>
        Add hospital stay records for this consultation
      </p>
      
      {hospitalRecords.length > 0 && (
        <div className={styles.recordsList}>
          {hospitalRecords.map((record, index) => (
            <div key={index} className={styles.fieldGroup}>
              <div className={styles.fieldGroupHeader}>
                <h3 className={styles.fieldGroupTitle}>
                  {record.hospitalName || 'Hospital Stay'}: {formatDate(record.admissionDate)}
                  {record.dischargeDate ? ` - ${formatDate(record.dischargeDate)}` : ' (Ongoing)'}
                </h3>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => handleDeleteRecord(index)}
                >
                  Remove
                </button>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Hospital Name</label>
                <p className={styles.formValue}>{record.hospitalName}</p>
              </div>
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Admission Date</label>
                  <p className={styles.formValue}>{formatDate(record.admissionDate)}</p>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Discharge Date</label>
                  <p className={styles.formValue}>
                    {record.dischargeDate ? formatDate(record.dischargeDate) : 'Not discharged'}
                  </p>
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Reason for Hospitalization</label>
                <p className={styles.formValue}>{record.reason}</p>
              </div>
              
              {record.treatments && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Treatments Received</label>
                  <p className={styles.formValue}>{record.treatments}</p>
                </div>
              )}
              
              {record.attendingDoctors && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Attending Doctors</label>
                  <p className={styles.formValue}>{record.attendingDoctors}</p>
                </div>
              )}
              
              {record.dischargeSummary && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Discharge Summary</label>
                  <p className={styles.formValue}>{record.dischargeSummary}</p>
                </div>
              )}
              
              {record.investigations && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Investigations Done</label>
                  <p className={styles.formValue}>{record.investigations}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className={styles.fieldGroup}>
        <h3 className={styles.fieldGroupTitle}>Add New Hospital Record</h3>
        
        <div className={styles.formGroup}>
          <label htmlFor="hospitalName" className={styles.formLabel}>
            Hospital Name <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="hospitalName"
            name="hospitalName"
            value={newRecord.hospitalName}
            onChange={handleInputChange}
            placeholder="Enter hospital name"
            className={classNames(
              styles.formInput,
              formErrors.hospitalName ? styles.inputError : ''
            )}
          />
          {formErrors.hospitalName && (
            <div className={styles.errorMessage}>{formErrors.hospitalName}</div>
          )}
        </div>
        
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="admissionDate" className={styles.formLabel}>
              Admission Date <span className={styles.required}>*</span>
            </label>
            <input
              type="date"
              id="admissionDate"
              name="admissionDate"
              value={newRecord.admissionDate}
              onChange={handleInputChange}
              className={classNames(
                styles.formInput,
                formErrors.admissionDate ? styles.inputError : ''
              )}
            />
            {formErrors.admissionDate && (
              <div className={styles.errorMessage}>{formErrors.admissionDate}</div>
            )}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="dischargeDate" className={styles.formLabel}>
              Discharge Date
            </label>
            <input
              type="date"
              id="dischargeDate"
              name="dischargeDate"
              value={newRecord.dischargeDate}
              onChange={handleInputChange}
              className={classNames(
                styles.formInput,
                formErrors.dischargeDate ? styles.inputError : ''
              )}
            />
            {formErrors.dischargeDate && (
              <div className={styles.errorMessage}>{formErrors.dischargeDate}</div>
            )}
          </div>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="reason" className={styles.formLabel}>
            Reason for Hospitalization <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="reason"
            name="reason"
            value={newRecord.reason}
            onChange={handleInputChange}
            placeholder="Enter reason for hospitalization"
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
          <label htmlFor="treatments" className={styles.formLabel}>
            Treatments Received
          </label>
          <textarea
            id="treatments"
            name="treatments"
            value={newRecord.treatments}
            onChange={handleInputChange}
            placeholder="Enter treatments received during hospital stay"
            className={styles.textarea}
            rows={3}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="attendingDoctors" className={styles.formLabel}>
            Attending Doctors
          </label>
          <input
            type="text"
            id="attendingDoctors"
            name="attendingDoctors"
            value={newRecord.attendingDoctors}
            onChange={handleInputChange}
            placeholder="Enter names of attending doctors"
            className={styles.formInput}
          />
        </div>
        
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="dischargeSummary" className={styles.formLabel}>
              Discharge Summary
            </label>
            <textarea
              id="dischargeSummary"
              name="dischargeSummary"
              value={newRecord.dischargeSummary}
              onChange={handleInputChange}
              placeholder="Enter discharge summary"
              className={styles.textarea}
              rows={3}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="investigations" className={styles.formLabel}>
              Investigations Done
            </label>
            <textarea
              id="investigations"
              name="investigations"
              value={newRecord.investigations}
              onChange={handleInputChange}
              placeholder="Enter investigations done during stay"
              className={styles.textarea}
              rows={3}
            />
          </div>
        </div>
        
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.addItemButton}
            onClick={handleAddRecord}
          >
            Add Hospital Record
          </button>
        </div>
      </div>
      
      {hospitalRecords.length === 0 && (
        <div className={styles.noDataMessage}>
          No hospital records added yet. Use the form above to add records.
        </div>
      )}
    </div>
  );
};

HospitalTab.propTypes = {
  hospitalRecords: PropTypes.array.isRequired,
  errors: PropTypes.object,
  touched: PropTypes.object,
  setFieldValue: PropTypes.func.isRequired
};

export default HospitalTab; 