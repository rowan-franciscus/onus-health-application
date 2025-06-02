import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import classNames from 'classnames';
import validation from '../../../utils/validation';
import styles from '../../shared/FormStep.module.css';

const PracticeInfoStep = ({ formData, onStepChange, next, previous, isSubmitting }) => {
  const validationSchema = Yup.object().shape({
    practiceInfo: validation.provider.onboarding.practiceInfo
  });

  const initialValues = {
    practiceInfo: formData.practiceInfo || {
      practiceName: '',
      practiceLocation: '',
      phone: '',
      email: '',
    }
  };

  const handleSubmit = (values) => {
    onStepChange(values);
    next();
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepHeading}>Practice Information</h2>
      
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ errors, touched }) => (
          <Form>
            <div className={styles.formGroup}>
              <label htmlFor="practiceInfo.practiceName" className={classNames(styles.label, styles.required)}>
                Practice or Clinic Name
              </label>
              <Field
                type="text"
                id="practiceInfo.practiceName"
                name="practiceInfo.practiceName"
                className={styles.input}
                placeholder="Enter your practice or clinic name"
              />
              <ErrorMessage name="practiceInfo.practiceName" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="practiceInfo.practiceLocation" className={classNames(styles.label, styles.required)}>
                Primary Practice Location
              </label>
              <Field
                as="textarea"
                id="practiceInfo.practiceLocation"
                name="practiceInfo.practiceLocation"
                className={styles.textarea}
                placeholder="Enter the full address of your primary practice location"
              />
              <ErrorMessage name="practiceInfo.practiceLocation" component="div" className={styles.error} />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formCol}>
                <div className={styles.formGroup}>
                  <label htmlFor="practiceInfo.phone" className={classNames(styles.label, styles.required)}>
                    Phone Number
                  </label>
                  <Field
                    type="tel"
                    id="practiceInfo.phone"
                    name="practiceInfo.phone"
                    className={styles.input}
                    placeholder="Enter practice phone number"
                  />
                  <ErrorMessage name="practiceInfo.phone" component="div" className={styles.error} />
                </div>
              </div>

              <div className={styles.formCol}>
                <div className={styles.formGroup}>
                  <label htmlFor="practiceInfo.email" className={classNames(styles.label, styles.required)}>
                    Email
                  </label>
                  <Field
                    type="email"
                    id="practiceInfo.email"
                    name="practiceInfo.email"
                    className={styles.input}
                    placeholder="Enter practice email address"
                  />
                  <ErrorMessage name="practiceInfo.email" component="div" className={styles.error} />
                </div>
              </div>
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

export default PracticeInfoStep; 