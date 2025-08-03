import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './ConsultationForm/tabs/FormTabs.module.css';

const PatientVitalsForm = ({
  values,
  errors,
  touched,
  handleChange,
  handleBlur
}) => {
  return (
    <div className={styles.tabContainer}>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="heartRate" className={styles.formLabel}>
            Heart Rate
          </label>
          <div className={styles.inputGroup}>
            <input
              type="number"
              id="heartRate"
              name="heartRate"
              value={values.heartRate || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter heart rate"
              className={classNames(
                styles.formInput,
                styles.inputWithUnit,
                touched?.heartRate && errors?.heartRate ? styles.inputError : ''
              )}
            />
            <span className={styles.inputUnit}>bpm</span>
          </div>
          {touched?.heartRate && errors?.heartRate && (
            <div className={styles.errorMessage}>{errors.heartRate}</div>
          )}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="bloodPressure.systolic" className={styles.formLabel}>
            Blood Pressure
          </label>
          <div className={styles.bloodPressureGroup}>
            <input
              type="number"
              id="bloodPressure.systolic"
              name="bloodPressure.systolic"
              value={values.bloodPressure?.systolic || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Systolic"
              className={classNames(
                styles.formInput,
                styles.bloodPressureInput,
                touched?.bloodPressure?.systolic && errors?.bloodPressure?.systolic ? styles.inputError : ''
              )}
            />
            <span className={styles.bloodPressureSeparator}>/</span>
            <input
              type="number"
              id="bloodPressure.diastolic"
              name="bloodPressure.diastolic"
              value={values.bloodPressure?.diastolic || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Diastolic"
              className={classNames(
                styles.formInput,
                styles.bloodPressureInput,
                touched?.bloodPressure?.diastolic && errors?.bloodPressure?.diastolic ? styles.inputError : ''
              )}
            />
            <span className={styles.inputUnit}>mmHg</span>
          </div>
          {(touched?.bloodPressure?.systolic && errors?.bloodPressure?.systolic) && (
            <div className={styles.errorMessage}>{errors.bloodPressure.systolic}</div>
          )}
          {(touched?.bloodPressure?.diastolic && errors?.bloodPressure?.diastolic) && (
            <div className={styles.errorMessage}>{errors.bloodPressure.diastolic}</div>
          )}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="bodyTemperature" className={styles.formLabel}>
            Body Temperature
          </label>
          <div className={styles.inputGroup}>
            <input
              type="number"
              id="bodyTemperature"
              name="bodyTemperature"
              value={values.bodyTemperature || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter body temperature"
              step="0.1"
              className={classNames(
                styles.formInput,
                styles.inputWithUnit,
                touched?.bodyTemperature && errors?.bodyTemperature ? styles.inputError : ''
              )}
            />
            <span className={styles.inputUnit}>°C</span>
          </div>
          {touched?.bodyTemperature && errors?.bodyTemperature && (
            <div className={styles.errorMessage}>{errors.bodyTemperature}</div>
          )}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="respiratoryRate" className={styles.formLabel}>
            Respiratory Rate
          </label>
          <div className={styles.inputGroup}>
            <input
              type="number"
              id="respiratoryRate"
              name="respiratoryRate"
              value={values.respiratoryRate || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter respiratory rate"
              className={classNames(
                styles.formInput,
                styles.inputWithUnit,
                touched?.respiratoryRate && errors?.respiratoryRate ? styles.inputError : ''
              )}
            />
            <span className={styles.inputUnit}>breaths/min</span>
          </div>
          {touched?.respiratoryRate && errors?.respiratoryRate && (
            <div className={styles.errorMessage}>{errors.respiratoryRate}</div>
          )}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="bloodGlucose" className={styles.formLabel}>
            Blood Glucose
          </label>
          <div className={styles.inputGroup}>
            <input
              type="number"
              id="bloodGlucose"
              name="bloodGlucose"
              value={values.bloodGlucose || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter blood glucose level"
              className={classNames(
                styles.formInput,
                styles.inputWithUnit,
                touched?.bloodGlucose && errors?.bloodGlucose ? styles.inputError : ''
              )}
            />
            <span className={styles.inputUnit}>mg/dL</span>
          </div>
          {touched?.bloodGlucose && errors?.bloodGlucose && (
            <div className={styles.errorMessage}>{errors.bloodGlucose}</div>
          )}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="bloodOxygenSaturation" className={styles.formLabel}>
            Blood Oxygen Saturation
          </label>
          <div className={styles.inputGroup}>
            <input
              type="number"
              id="bloodOxygenSaturation"
              name="bloodOxygenSaturation"
              value={values.bloodOxygenSaturation || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter blood oxygen level"
              min="0"
              max="100"
              className={classNames(
                styles.formInput,
                styles.inputWithUnit,
                touched?.bloodOxygenSaturation && errors?.bloodOxygenSaturation ? styles.inputError : ''
              )}
            />
            <span className={styles.inputUnit}>%</span>
          </div>
          {touched?.bloodOxygenSaturation && errors?.bloodOxygenSaturation && (
            <div className={styles.errorMessage}>{errors.bloodOxygenSaturation}</div>
          )}
        </div>
      </div>
      
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="bmi" className={styles.formLabel}>
            BMI
          </label>
          <input
            type="number"
            id="bmi"
            name="bmi"
            value={values.bmi || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter BMI"
            step="0.1"
            className={classNames(
              styles.formInput,
              touched?.bmi && errors?.bmi ? styles.inputError : ''
            )}
          />
          {touched?.bmi && errors?.bmi && (
            <div className={styles.errorMessage}>{errors.bmi}</div>
          )}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="bodyFatPercentage" className={styles.formLabel}>
            Body Fat Percentage
          </label>
          <div className={styles.inputGroup}>
            <input
              type="number"
              id="bodyFatPercentage"
              name="bodyFatPercentage"
              value={values.bodyFatPercentage || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter body fat percentage"
              min="0"
              max="100"
              step="0.1"
              className={classNames(
                styles.formInput,
                styles.inputWithUnit,
                touched?.bodyFatPercentage && errors?.bodyFatPercentage ? styles.inputError : ''
              )}
            />
            <span className={styles.inputUnit}>%</span>
          </div>
          {touched?.bodyFatPercentage && errors?.bodyFatPercentage && (
            <div className={styles.errorMessage}>{errors.bodyFatPercentage}</div>
          )}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="weight" className={styles.formLabel}>
            Weight
          </label>
          <div className={styles.inputGroup}>
            <input
              type="number"
              id="weight"
              name="weight"
              value={values.weight || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter weight"
              step="0.1"
              className={classNames(
                styles.formInput,
                styles.inputWithUnit,
                touched?.weight && errors?.weight ? styles.inputError : ''
              )}
            />
            <span className={styles.inputUnit}>kg</span>
          </div>
          {touched?.weight && errors?.weight && (
            <div className={styles.errorMessage}>{errors.weight}</div>
          )}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="height" className={styles.formLabel}>
            Height
          </label>
          <div className={styles.inputGroup}>
            <input
              type="number"
              id="height"
              name="height"
              value={values.height || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter height"
              step="0.1"
              className={classNames(
                styles.formInput,
                styles.inputWithUnit,
                touched?.height && errors?.height ? styles.inputError : ''
              )}
            />
            <span className={styles.inputUnit}>cm</span>
          </div>
          {touched?.height && errors?.height && (
            <div className={styles.errorMessage}>{errors.height}</div>
          )}
        </div>
      </div>
    </div>
  );
};

PatientVitalsForm.propTypes = {
  values: PropTypes.object.isRequired,
  errors: PropTypes.object,
  touched: PropTypes.object,
  handleChange: PropTypes.func.isRequired,
  handleBlur: PropTypes.func.isRequired
};

export default PatientVitalsForm; 