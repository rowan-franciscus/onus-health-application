import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './FormTabs.module.css';

const GeneralTab = ({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  setFieldValue
}) => {
  return (
    <div className={styles.tabContainer}>
      <h2 className={styles.tabTitle}>General Information</h2>
      <p className={styles.tabDescription}>
        Enter basic information about this consultation
      </p>
      
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="general.date" className={styles.formLabel}>
            Date <span className={styles.required}>*</span>
          </label>
          <input
            type="date"
            id="general.date"
            name="general.date"
            value={values.date || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            className={classNames(
              styles.formInput,
              touched?.date && errors?.date ? styles.inputError : ''
            )}
          />
          {touched?.date && errors?.date && (
            <div className={styles.errorMessage}>{errors.date}</div>
          )}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="general.specialistName" className={styles.formLabel}>
            Specialist Name <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="general.specialistName"
            name="general.specialistName"
            value={values.specialistName || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter specialist's full name"
            className={classNames(
              styles.formInput,
              touched?.specialistName && errors?.specialistName ? styles.inputError : ''
            )}
          />
          {touched?.specialistName && errors?.specialistName && (
            <div className={styles.errorMessage}>{errors.specialistName}</div>
          )}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="general.specialty" className={styles.formLabel}>
            Specialty <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="general.specialty"
            name="general.specialty"
            value={values.specialty || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter medical specialty"
            className={classNames(
              styles.formInput,
              touched?.specialty && errors?.specialty ? styles.inputError : ''
            )}
          />
          {touched?.specialty && errors?.specialty && (
            <div className={styles.errorMessage}>{errors.specialty}</div>
          )}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="general.practiceName" className={styles.formLabel}>
            Practice Name
          </label>
          <input
            type="text"
            id="general.practiceName"
            name="general.practiceName"
            value={values.practiceName || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter practice or clinic name"
            className={styles.formInput}
          />
        </div>
      </div>
      
      <div className={styles.formGroup}>
        <label htmlFor="general.reasonForVisit" className={styles.formLabel}>
          Reason for Visit <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          id="general.reasonForVisit"
          name="general.reasonForVisit"
          value={values.reasonForVisit || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Enter the primary reason for this consultation"
          className={classNames(
            styles.formInput,
            touched?.reasonForVisit && errors?.reasonForVisit ? styles.inputError : ''
          )}
        />
        {touched?.reasonForVisit && errors?.reasonForVisit && (
          <div className={styles.errorMessage}>{errors.reasonForVisit}</div>
        )}
      </div>
      
      <div className={styles.formGroup}>
        <label htmlFor="general.notes" className={styles.formLabel}>
          Notes / Observations
        </label>
        <textarea
          id="general.notes"
          name="general.notes"
          value={values.notes || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Enter any additional notes or observations"
          className={styles.textarea}
          rows={5}
        />
      </div>
    </div>
  );
};

GeneralTab.propTypes = {
  values: PropTypes.object.isRequired,
  errors: PropTypes.object,
  touched: PropTypes.object,
  handleChange: PropTypes.func.isRequired,
  handleBlur: PropTypes.func.isRequired,
  setFieldValue: PropTypes.func.isRequired
};

export default GeneralTab; 