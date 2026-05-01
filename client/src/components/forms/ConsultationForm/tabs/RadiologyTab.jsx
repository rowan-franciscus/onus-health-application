import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { formatDate } from '../../../../utils/dateUtils';
import styles from './FormTabs.module.css';

const EMPTY_DRAFT = { scanType: '', date: '', bodyPart: '', findings: '', recommendations: '' };

const RadiologyTab = ({
  radiologyReports,
  draftRadiologyReport,
  handleChange,
  handleBlur,
  setFieldValue,
}) => {
  const draft = draftRadiologyReport || EMPTY_DRAFT;
  const [formErrors, setFormErrors] = useState({});

  const validateReport = (report) => {
    const errors = {};
    if (!report.scanType.trim()) errors.scanType = 'Scan type is required';
    if (!report.date) errors.date = 'Scan date is required';
    if (!report.bodyPart.trim()) errors.bodyPart = 'Body part examined is required';
    if (!report.findings.trim()) errors.findings = 'Findings are required';
    return errors;
  };

  const handleAddReport = () => {
    const validationErrors = validateReport(draft);
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }
    setFieldValue('radiology', [...radiologyReports, draft]);
    setFieldValue('draftRadiologyReport', EMPTY_DRAFT);
    setFormErrors({});
  };

  const handleDeleteReport = (index) => {
    setFieldValue('radiology', radiologyReports.filter((_, i) => i !== index));
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
            <label htmlFor="draftRadiologyReport.scanType" className={styles.formLabel}>
              Scan Type <span className={styles.required}>*</span>
            </label>
            <select
              id="draftRadiologyReport.scanType"
              name="draftRadiologyReport.scanType"
              value={draft.scanType}
              onChange={handleChange}
              onBlur={handleBlur}
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
            <label htmlFor="draftRadiologyReport.date" className={styles.formLabel}>
              Date <span className={styles.required}>*</span>
            </label>
            <input
              type="date"
              id="draftRadiologyReport.date"
              name="draftRadiologyReport.date"
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

          <div className={styles.formGroup}>
            <label htmlFor="draftRadiologyReport.bodyPart" className={styles.formLabel}>
              Body Part Examined <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="draftRadiologyReport.bodyPart"
              name="draftRadiologyReport.bodyPart"
              value={draft.bodyPart}
              onChange={handleChange}
              onBlur={handleBlur}
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
          <label htmlFor="draftRadiologyReport.findings" className={styles.formLabel}>
            Findings <span className={styles.required}>*</span>
          </label>
          <textarea
            id="draftRadiologyReport.findings"
            name="draftRadiologyReport.findings"
            value={draft.findings}
            onChange={handleChange}
            onBlur={handleBlur}
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
          <label htmlFor="draftRadiologyReport.recommendations" className={styles.formLabel}>
            Recommendations
          </label>
          <textarea
            id="draftRadiologyReport.recommendations"
            name="draftRadiologyReport.recommendations"
            value={draft.recommendations}
            onChange={handleChange}
            onBlur={handleBlur}
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
  draftRadiologyReport: PropTypes.object,
  handleChange: PropTypes.func.isRequired,
  handleBlur: PropTypes.func.isRequired,
  setFieldValue: PropTypes.func.isRequired,
};

export default RadiologyTab;
