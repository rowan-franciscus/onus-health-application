import React from 'react';
import PropTypes from 'prop-types';
import styles from './FormTabs.module.css';

const ManagementTab = ({
  management = '',
  medication = {},
  setFieldValue
}) => {
  const setManagement = (value) => setFieldValue('management', value);
  const setMedicationField = (key, value) =>
    setFieldValue('medication', { ...medication, [key]: value });

  return (
    <div className={styles.tabContainer}>
      <h2 className={styles.tabTitle}>Management</h2>
      <p className={styles.tabDescription}>
        Document medications and management plan for this consultation
      </p>

      <div className={styles.formGroup}>
        <label htmlFor="management" className={styles.formLabel}>
          Medications <span className={styles.required}>*</span>
        </label>
        <textarea
          id="management"
          name="management"
          value={management}
          onChange={(e) => setManagement(e.target.value)}
          placeholder={
            'Enter medication name, dosage, frequency, and route of administration. You can list multiple medications, one per line.\n\nExample: Amoxicillin 500 mg, three times daily, oral, for 7 days.'
          }
          className={styles.textarea}
          style={{ minHeight: 160 }}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="medication.reason" className={styles.formLabel}>
          Reason for Prescription
        </label>
        <input
          type="text"
          id="medication.reason"
          name="medication.reason"
          value={medication.reason || ''}
          onChange={(e) => setMedicationField('reason', e.target.value)}
          placeholder="Enter reason for prescription"
          className={styles.formInput}
        />
      </div>

      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="medication.startDate" className={styles.formLabel}>
            Start Date
          </label>
          <input
            type="date"
            id="medication.startDate"
            name="medication.startDate"
            value={medication.startDate || ''}
            onChange={(e) => setMedicationField('startDate', e.target.value)}
            className={styles.formInput}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="medication.endDate" className={styles.formLabel}>
            End Date
          </label>
          <input
            type="date"
            id="medication.endDate"
            name="medication.endDate"
            value={medication.endDate || ''}
            onChange={(e) => setMedicationField('endDate', e.target.value)}
            className={styles.formInput}
          />
        </div>
      </div>
    </div>
  );
};

ManagementTab.propTypes = {
  management: PropTypes.string,
  medication: PropTypes.object,
  setFieldValue: PropTypes.func.isRequired
};

export default ManagementTab;
