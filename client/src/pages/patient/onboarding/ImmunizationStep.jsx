import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import classNames from 'classnames';
import validation from '../../../utils/validation';
import styles from '../../shared/FormStep.module.css';

const ImmunizationStep = ({ formData, onStepChange, next, previous, isSubmitting }) => {
  const validationSchema = Yup.object().shape({
    immunization: validation.patient.onboarding.immunization
  });

  const initialValues = {
    immunization: formData.immunization || {
      immunizationHistory: '',
    }
  };

  const handleSubmit = (values) => {
    onStepChange(values);
    next();
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepHeading}>Immunization</h2>
      
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isValid, dirty, errors, touched }) => (
          <Form>
            <div className={styles.formGroup}>
              <label htmlFor="immunization.immunizationHistory" className={styles.label}>
                Have you been immunized? (Flu, COVID-19, Tetanus)
              </label>
              <Field
                as="textarea"
                id="immunization.immunizationHistory"
                name="immunization.immunizationHistory"
                className={styles.textarea}
                placeholder="Please list any vaccinations you have received, with dates if known (e.g. COVID-19 vaccine - March 2021, Tetanus booster - 2018)"
              />
              <ErrorMessage name="immunization.immunizationHistory" component="div" className={styles.error} />
              <p className={styles.fieldDescription}>
                Keeping track of your immunization history helps ensure you're protected against preventable diseases
                and helps healthcare providers recommend appropriate vaccinations.
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

export default ImmunizationStep; 