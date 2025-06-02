import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import classNames from 'classnames';
import validation from '../../../utils/validation';
import styles from '../../shared/FormStep.module.css';

const FamilyHistoryStep = ({ formData, onStepChange, next, previous, isSubmitting }) => {
  const validationSchema = Yup.object().shape({
    familyHistory: validation.patient.onboarding.familyHistory
  });

  const initialValues = {
    familyHistory: formData.familyHistory || {
      familyChronicConditions: '',
      hereditaryConditions: '',
    }
  };

  const handleSubmit = (values) => {
    onStepChange(values);
    next();
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepHeading}>Family Medical History</h2>
      
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isValid, dirty, errors, touched }) => (
          <Form>
            <div className={styles.formGroup}>
              <label htmlFor="familyHistory.familyChronicConditions" className={styles.label}>
                Does anyone in your family have a history of chronic illnesses (e.g. heart disease, cancer, diabetes)?
              </label>
              <Field
                as="textarea"
                id="familyHistory.familyChronicConditions"
                name="familyHistory.familyChronicConditions"
                className={styles.textarea}
                placeholder="Please list any chronic illnesses in your family history and indicate the relationship (e.g. mother, father, sibling)"
              />
              <ErrorMessage name="familyHistory.familyChronicConditions" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="familyHistory.hereditaryConditions" className={styles.label}>
                Do you have any hereditary conditions?
              </label>
              <Field
                as="textarea"
                id="familyHistory.hereditaryConditions"
                name="familyHistory.hereditaryConditions"
                className={styles.textarea}
                placeholder="Please list any hereditary conditions you may have"
              />
              <ErrorMessage name="familyHistory.hereditaryConditions" component="div" className={styles.error} />
              <p className={styles.fieldDescription}>
                Understanding your family medical history helps healthcare providers identify potential genetic risk factors
                and preventive measures that may be beneficial for you.
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

export default FamilyHistoryStep; 