import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { formatDate } from '../../../../utils/dateUtils';
import styles from './FormTabs.module.css';

const EMPTY_DRAFT = { testName: '', labName: '', date: '', results: '', comments: '' };

const LabResultsTab = ({
  labResults,
  draftLabResult,
  handleChange,
  handleBlur,
  setFieldValue,
}) => {
  const draft = draftLabResult || EMPTY_DRAFT;
  const [formErrors, setFormErrors] = useState({});

  const validateLabResult = (labResult) => {
    const errors = {};
    if (!labResult.testName.trim()) errors.testName = 'Test name is required';
    if (!labResult.date) errors.date = 'Test date is required';
    if (!labResult.results.trim()) errors.results = 'Results are required';
    return errors;
  };

  const handleAddLabResult = () => {
    const validationErrors = validateLabResult(draft);
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }
    setFieldValue('labResults', [...labResults, draft]);
    setFieldValue('draftLabResult', EMPTY_DRAFT);
    setFormErrors({});
  };

  const handleDeleteLabResult = (index) => {
    setFieldValue('labResults', labResults.filter((_, i) => i !== index));
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
                  {labResult.testName} - {formatDate(labResult.date)}
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
                  <p className={styles.formValue}>{formatDate(labResult.date)}</p>
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
            <label htmlFor="draftLabResult.testName" className={styles.formLabel}>
              Test Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="draftLabResult.testName"
              name="draftLabResult.testName"
              value={draft.testName}
              onChange={handleChange}
              onBlur={handleBlur}
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
            <label htmlFor="draftLabResult.labName" className={styles.formLabel}>
              Lab Name
            </label>
            <input
              type="text"
              id="draftLabResult.labName"
              name="draftLabResult.labName"
              value={draft.labName}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter laboratory name"
              className={styles.formInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="draftLabResult.date" className={styles.formLabel}>
              Test Date <span className={styles.required}>*</span>
            </label>
            <input
              type="date"
              id="draftLabResult.date"
              name="draftLabResult.date"
              value={draft.date}
              onChange={handleChange}
              onBlur={handleBlur}
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
          <label htmlFor="draftLabResult.results" className={styles.formLabel}>
            Results <span className={styles.required}>*</span>
          </label>
          <textarea
            id="draftLabResult.results"
            name="draftLabResult.results"
            value={draft.results}
            onChange={handleChange}
            onBlur={handleBlur}
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
          <label htmlFor="draftLabResult.comments" className={styles.formLabel}>
            Comments or Diagnosis
          </label>
          <textarea
            id="draftLabResult.comments"
            name="draftLabResult.comments"
            value={draft.comments}
            onChange={handleChange}
            onBlur={handleBlur}
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
  draftLabResult: PropTypes.object,
  handleChange: PropTypes.func.isRequired,
  handleBlur: PropTypes.func.isRequired,
  setFieldValue: PropTypes.func.isRequired,
};

export default LabResultsTab;
