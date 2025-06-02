import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './FormTabs.module.css';

const LabResultsTab = ({
  labResults,
  errors,
  touched,
  setFieldValue
}) => {
  const [newLabResult, setNewLabResult] = useState({
    testName: '',
    labName: '',
    date: '',
    results: '',
    comments: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  
  const validateLabResult = (labResult) => {
    const errors = {};
    
    if (!labResult.testName.trim()) {
      errors.testName = 'Test name is required';
    }
    
    if (!labResult.date) {
      errors.date = 'Test date is required';
    }
    
    if (!labResult.results.trim()) {
      errors.results = 'Results are required';
    }
    
    return errors;
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewLabResult(prev => ({
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
  
  const handleAddLabResult = () => {
    const validationErrors = validateLabResult(newLabResult);
    
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }
    
    // Add the new lab result to the list
    const updatedLabResults = [...labResults, newLabResult];
    setFieldValue('labResults', updatedLabResults);
    
    // Reset the form for the next lab result
    setNewLabResult({
      testName: '',
      labName: '',
      date: '',
      results: '',
      comments: ''
    });
    
    setFormErrors({});
  };
  
  const handleDeleteLabResult = (index) => {
    const updatedLabResults = labResults.filter((_, i) => i !== index);
    setFieldValue('labResults', updatedLabResults);
  };
  
  return (
    <div className={styles.tabContainer}>
      <h2 className={styles.tabTitle}>Lab Results</h2>
      <p className={styles.tabDescription}>
        Add laboratory test results for this consultation
      </p>
      
      {labResults.length > 0 && (
        <div className={styles.labResultsList}>
          {labResults.map((labResult, index) => (
            <div key={index} className={styles.fieldGroup}>
              <div className={styles.fieldGroupHeader}>
                <h3 className={styles.fieldGroupTitle}>
                  {labResult.testName} - {new Date(labResult.date).toLocaleDateString()}
                </h3>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => handleDeleteLabResult(index)}
                >
                  Remove
                </button>
              </div>
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Test Name</label>
                  <p className={styles.formValue}>{labResult.testName}</p>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Lab Name</label>
                  <p className={styles.formValue}>{labResult.labName || 'Not specified'}</p>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Test Date</label>
                  <p className={styles.formValue}>{new Date(labResult.date).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Results</label>
                <p className={styles.formValue}>{labResult.results}</p>
              </div>
              
              {labResult.comments && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Comments or Diagnosis</label>
                  <p className={styles.formValue}>{labResult.comments}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className={styles.fieldGroup}>
        <h3 className={styles.fieldGroupTitle}>Add New Lab Result</h3>
        
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="testName" className={styles.formLabel}>
              Test Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="testName"
              name="testName"
              value={newLabResult.testName}
              onChange={handleInputChange}
              placeholder="Enter test name"
              className={classNames(
                styles.formInput,
                formErrors.testName ? styles.inputError : ''
              )}
            />
            {formErrors.testName && (
              <div className={styles.errorMessage}>{formErrors.testName}</div>
            )}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="labName" className={styles.formLabel}>
              Lab Name
            </label>
            <input
              type="text"
              id="labName"
              name="labName"
              value={newLabResult.labName}
              onChange={handleInputChange}
              placeholder="Enter laboratory name"
              className={styles.formInput}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="date" className={styles.formLabel}>
              Test Date <span className={styles.required}>*</span>
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={newLabResult.date}
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
          <label htmlFor="results" className={styles.formLabel}>
            Results <span className={styles.required}>*</span>
          </label>
          <textarea
            id="results"
            name="results"
            value={newLabResult.results}
            onChange={handleInputChange}
            placeholder="Enter test results"
            className={classNames(
              styles.textarea,
              formErrors.results ? styles.inputError : ''
            )}
            rows={3}
          />
          {formErrors.results && (
            <div className={styles.errorMessage}>{formErrors.results}</div>
          )}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="comments" className={styles.formLabel}>
            Comments or Diagnosis
          </label>
          <textarea
            id="comments"
            name="comments"
            value={newLabResult.comments}
            onChange={handleInputChange}
            placeholder="Enter any comments or diagnosis related to results"
            className={styles.textarea}
            rows={3}
          />
        </div>
        
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.addItemButton}
            onClick={handleAddLabResult}
          >
            Add Lab Result
          </button>
        </div>
      </div>
      
      {labResults.length === 0 && (
        <div className={styles.noDataMessage}>
          No lab results added yet. Use the form above to add lab results.
        </div>
      )}
    </div>
  );
};

LabResultsTab.propTypes = {
  labResults: PropTypes.array.isRequired,
  errors: PropTypes.object,
  touched: PropTypes.object,
  setFieldValue: PropTypes.func.isRequired
};

export default LabResultsTab; 