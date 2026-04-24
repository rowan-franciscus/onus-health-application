import React from 'react';
import PropTypes from 'prop-types';
import styles from './FormTabs.module.css';

const HistoryTab = ({ values, handleChange, handleBlur }) => {
  return (
    <div className={styles.tabContainer}>
      <h2 className={styles.tabTitle}>Record Patient History</h2>
      <p className={styles.tabDescription}>
        Document the patient's medical history in detail
      </p>

      <div className={styles.formGroup}>
        <textarea
          id="history"
          name="history"
          value={values.history || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Enter patient history relevant to this case."
          className={styles.textarea}
          style={{ minHeight: 260 }}
        />
      </div>
    </div>
  );
};

HistoryTab.propTypes = {
  values: PropTypes.object.isRequired,
  handleChange: PropTypes.func.isRequired,
  handleBlur: PropTypes.func
};

export default HistoryTab;
