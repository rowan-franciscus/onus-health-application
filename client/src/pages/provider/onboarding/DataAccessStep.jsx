import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import classNames from 'classnames';
import validation from '../../../utils/validation';
import styles from '../../shared/FormStep.module.css';

const DataAccessStep = ({ formData, onStepChange, next, previous, isSubmitting }) => {
  const validationSchema = Yup.object().shape({
    dataAccess: validation.provider.onboarding.dataAccess
  });

  const initialValues = {
    dataAccess: formData.dataAccess || {
      criticalInfo: '',
      historicalData: '',
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
        {({ errors, touched }) => (
          <Form>
            <div className={styles.formGroup}>
              <label htmlFor="dataAccess.criticalInfo" className={classNames(styles.label, styles.required)}>
                What patient information is most critical for your decision making? (e.g., vitals, lab results, family history)
              </label>
              <Field
                as="textarea"
                id="dataAccess.criticalInfo"
                name="dataAccess.criticalInfo"
                className={styles.textarea}
                placeholder="List the types of patient information most important for your clinical decision-making"
              />
              <ErrorMessage name="dataAccess.criticalInfo" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="dataAccess.historicalData" className={classNames(styles.label, styles.required)}>
                Do you require access to historical data trends (e.g. for chronic conditions)?
              </label>
              <Field
                as="textarea"
                id="dataAccess.historicalData"
                name="dataAccess.historicalData"
                className={styles.textarea}
                placeholder="Describe what historical data would be most valuable for your practice"
              />
              <ErrorMessage name="dataAccess.historicalData" component="div" className={styles.error} />
              <p className={styles.fieldDescription}>
                These preferences help us customize your dashboard and reporting tools to display
                the most relevant patient information for your specialty.
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
                className={classNames(styles.button, styles.buttonPrimary)}
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

export default DataAccessStep; 