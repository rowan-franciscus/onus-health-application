import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import classNames from 'classnames';
import validation from '../../../utils/validation';
import styles from '../../shared/FormStep.module.css';

const CurrentMedicationStep = ({ formData, onStepChange, next, previous, isSubmitting }) => {
  const validationSchema = Yup.object().shape({
    currentMedication: validation.patient.onboarding.currentMedication
  });

  const initialValues = {
    currentMedication: formData.currentMedication || {
      medications: '',
      supplements: '',
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
              <label htmlFor="currentMedication.medications" className={styles.label}>
                List of current medications (including dosage and frequency)
              </label>
              <Field
                as="textarea"
                id="currentMedication.medications"
                name="currentMedication.medications"
                className={styles.textarea}
                placeholder="Please list all medications you are currently taking with dosage and frequency (e.g. Lisinopril 10mg, once daily)"
              />
              <ErrorMessage name="currentMedication.medications" component="div" className={styles.error} />
              <p className={styles.fieldDescription}>
                Include prescription medications, over-the-counter drugs, and any other treatments.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="currentMedication.supplements" className={styles.label}>
                List of current supplements or vitamins
              </label>
              <Field
                as="textarea"
                id="currentMedication.supplements"
                name="currentMedication.supplements"
                className={styles.textarea}
                placeholder="Please list all supplements or vitamins you take regularly (e.g. Vitamin D 1000 IU daily, Fish Oil 1000mg twice daily)"
              />
              <ErrorMessage name="currentMedication.supplements" component="div" className={styles.error} />
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

export default CurrentMedicationStep; 