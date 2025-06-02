import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import classNames from 'classnames';
import validation from '../../../utils/validation';
import styles from '../../shared/FormStep.module.css';

const AllergiesStep = ({ formData, onStepChange, next, previous, isSubmitting }) => {
  const validationSchema = Yup.object().shape({
    allergies: validation.patient.onboarding.allergies
  });

  const initialValues = {
    allergies: formData.allergies || {
      knownAllergies: '',
    }
  };

  const handleSubmit = (values) => {
    onStepChange(values);
    next();
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepHeading}>Allergies</h2>
      
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isValid, dirty, errors, touched }) => (
          <Form>
            <div className={styles.formGroup}>
              <label htmlFor="allergies.knownAllergies" className={styles.label}>
                Do you have any known allergies (medications, foods, environment, etc.)?
              </label>
              <Field
                as="textarea"
                id="allergies.knownAllergies"
                name="allergies.knownAllergies"
                className={styles.textarea}
                placeholder="Please list any allergies and describe the reaction you experience"
              />
              <ErrorMessage name="allergies.knownAllergies" component="div" className={styles.error} />
              <p className={styles.fieldDescription}>
                If you have no known allergies, please write "No known allergies" in the field above.
                Being aware of allergies is crucial for your safety during healthcare treatments.
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

export default AllergiesStep; 