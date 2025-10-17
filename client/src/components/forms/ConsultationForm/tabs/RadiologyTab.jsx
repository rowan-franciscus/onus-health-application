import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { formatDate } from '../../../../utils/dateUtils';
import styles from './FormTabs.module.css';

const RadiologyTab = ({
  radiologyReports,
  errors,
  touched,
  setFieldValue
}) => {
  const [newReport, setNewReport] = useState({
    scanType: '',
    date: '',
    bodyPart: '',
    findings: '',
    recommendations: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  
  const validateReport = (report) => {
    const errors = {};
    
    if (!report.scanType.trim()) {
      errors.scanType = 'Scan type is required';
    }
    
    if (!report.date) {
      errors.date = 'Scan date is required';
    }
    
    if (!report.bodyPart.trim()) {
      errors.bodyPart = 'Body part examined is required';
    }
    
    if (!report.findings.trim()) {
      errors.findings = 'Findings are required';
    }
    
    return errors;
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewReport(prev => ({
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
  
  const handleAddReport = () => {
    const validationErrors = validateReport(newReport);
    
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }
    
    // Add the new report to the list
    const updatedReports = [...radiologyReports, newReport];
    setFieldValue('radiology', updatedReports);
    
    // Reset the form for the next report
    setNewReport({
      scanType: '',
      date: '',
      bodyPart: '',
      findings: '',
      recommendations: ''
    });
    
    setFormErrors({});
  };
  
  const handleDeleteReport = (index) => {
    const updatedReports = radiologyReports.filter((_, i) => i !== index);
    setFieldValue('radiology', updatedReports);
  };
  
  return (
    <div className={styles.tabContainer}>
      <h2 className={styles.tabTitle}>Radiology Reports</h2>
      <p className={styles.tabDescription}>
        Add radiology scan reports for this consultation
      </p>
      
      {radiologyReports.length > 0 && (
        <div className={styles.reportsLists}>
          {radiologyReports.map((report, index) => (
            <div key={index} className={styles.fieldGroup}>
              <div className={styles.fieldGroupHeader}>
                <h3 className={styles.fieldGroupTitle}>
                  {report.scanType} - {report.bodyPart}
                </h3>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => handleDeleteReport(index)}
                >
                  Remove
                </button>
              </div>
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Scan Type</label>
                  <p className={styles.formValue}>{report.scanType}</p>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Date</label>
                  <p className={styles.formValue}>{formatDate(report.date)}</p>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Body Part Examined</label>
                  <p className={styles.formValue}>{report.bodyPart}</p>
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Findings</label>
                <p className={styles.formValue}>{report.findings}</p>
              </div>
              
              {report.recommendations && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Recommendations</label>
                  <p className={styles.formValue}>{report.recommendations}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className={styles.fieldGroup}>
        <h3 className={styles.fieldGroupTitle}>Add New Radiology Report</h3>
        
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="scanType" className={styles.formLabel}>
              Scan Type <span className={styles.required}>*</span>
            </label>
            <select
              id="scanType"
              name="scanType"
              value={newReport.scanType}
              onChange={handleInputChange}
              className={classNames(
                styles.formInput,
                formErrors.scanType ? styles.inputError : ''
              )}
            >
              <option value="">Select scan type</option>
              <option value="X-Ray">X-Ray</option>
              <option value="CT Scan">CT Scan</option>
              <option value="MRI">MRI</option>
              <option value="Ultrasound">Ultrasound</option>
              <option value="PET Scan">PET Scan</option>
              <option value="Mammography">Mammography</option>
              <option value="Fluoroscopy">Fluoroscopy</option>
              <option value="Angiography">Angiography</option>
              <option value="Other">Other</option>
            </select>
            {formErrors.scanType && (
              <div className={styles.errorMessage}>{formErrors.scanType}</div>
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
              value={newReport.date}
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
            <label htmlFor="bodyPart" className={styles.formLabel}>
              Body Part Examined <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="bodyPart"
              name="bodyPart"
              value={newReport.bodyPart}
              onChange={handleInputChange}
              placeholder="Enter body part examined"
              className={classNames(
                styles.formInput,
                formErrors.bodyPart ? styles.inputError : ''
              )}
            />
            {formErrors.bodyPart && (
              <div className={styles.errorMessage}>{formErrors.bodyPart}</div>
            )}
          </div>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="findings" className={styles.formLabel}>
            Findings <span className={styles.required}>*</span>
          </label>
          <textarea
            id="findings"
            name="findings"
            value={newReport.findings}
            onChange={handleInputChange}
            placeholder="Enter scan findings"
            className={classNames(
              styles.textarea,
              formErrors.findings ? styles.inputError : ''
            )}
            rows={3}
          />
          {formErrors.findings && (
            <div className={styles.errorMessage}>{formErrors.findings}</div>
          )}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="recommendations" className={styles.formLabel}>
            Recommendations
          </label>
          <textarea
            id="recommendations"
            name="recommendations"
            value={newReport.recommendations}
            onChange={handleInputChange}
            placeholder="Enter recommendations based on the findings"
            className={styles.textarea}
            rows={3}
          />
        </div>
        
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.addItemButton}
            onClick={handleAddReport}
          >
            Add Radiology Report
          </button>
        </div>
      </div>
      
      {radiologyReports.length === 0 && (
        <div className={styles.noDataMessage}>
          No radiology reports added yet. Use the form above to add reports.
        </div>
      )}
    </div>
  );
};

RadiologyTab.propTypes = {
  radiologyReports: PropTypes.array.isRequired,
  errors: PropTypes.object,
  touched: PropTypes.object,
  setFieldValue: PropTypes.func.isRequired
};

export default RadiologyTab; 