import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import classNames from 'classnames';
import validation from '../../../utils/validation';
import styles from '../../shared/FormStep.module.css';

const MedicalHistoryStep = ({ formData, onStepChange, next, previous, isSubmitting }) => {
  const validationSchema = Yup.object().shape({
    medicalHistory: validation.patient.onboarding.medicalHistory
  });

  const initialValues = {
    medicalHistory: formData.medicalHistory || {
      chronicConditions: '',
      significantIllnesses: '',
      mentalHealthHistory: '',
    }
  };

  const handleSubmit = (values) => {
    onStepChange(values);
    next();
  };

  return (
    <div className={styles.stepContainer}>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isValid, dirty, errors, touched }) => (
          <Form>
            <div className={styles.formGroup}>
              <label htmlFor="medicalHistory.chronicConditions" className={styles.label}>
                Do you have any chronic conditions (e.g. diabetes, asthma)?
              </label>
              <Field
                as="textarea"
                id="medicalHistory.chronicConditions"
                name="medicalHistory.chronicConditions"
                className={styles.textarea}
                placeholder="List any chronic conditions you have"
              />
              <ErrorMessage name="medicalHistory.chronicConditions" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="medicalHistory.significantIllnesses" className={styles.label}>
                Have you had any significant illnesses, surgeries, or hospitalisations?
              </label>
              <Field
                as="textarea"
                id="medicalHistory.significantIllnesses"
                name="medicalHistory.significantIllnesses"
                className={styles.textarea}
                placeholder="Describe any significant medical events, including dates if possible"
              />
              <ErrorMessage name="medicalHistory.significantIllnesses" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="medicalHistory.mentalHealthHistory" className={styles.label}>
                Have you had any mental health conditions or history?
              </label>
              <Field
                as="textarea"
                id="medicalHistory.mentalHealthHistory"
                name="medicalHistory.mentalHealthHistory"
                className={styles.textarea}
                placeholder="Describe any mental health conditions or history"
              />
              <ErrorMessage name="medicalHistory.mentalHealthHistory" component="div" className={styles.error} />
              <p className={styles.fieldDescription}>
                This information helps your healthcare provider understand your complete health picture and provide appropriate care.
                All information is kept confidential.
              </p>
            </div>

            <div className={styles.buttonGroup}>
              <button
                type="button"
                onClick={previous}
                className={classNames(styles.button, styles.buttonSecondary)}
              >
                Previous
              </button>
              <button
                type="submit"
                className={classNames(styles.button, styles.buttonPrimary, {
                  [styles.buttonDisabled]: isSubmitting
                })}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Next'}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default MedicalHistoryStep; 