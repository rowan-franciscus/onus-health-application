import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import classNames from 'classnames';
import validation from '../../../utils/validation';
import styles from '../../shared/FormStep.module.css';

const HealthInsuranceStep = ({ formData, onStepChange, next, previous, isSubmitting }) => {
  const validationSchema = Yup.object().shape({
    healthInsurance: validation.patient.onboarding.healthInsurance
  });

  const initialValues = {
    healthInsurance: formData.healthInsurance || {
      provider: '',
      plan: '',
      insuranceNumber: '',
      emergencyContactName: '',
      emergencyContactNumber: '',
      emergencyContactRelationship: '',
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
              <label htmlFor="healthInsurance.provider" className={classNames(styles.label, styles.required)}>
                Health Insurance Provider
              </label>
              <Field
                type="text"
                id="healthInsurance.provider"
                name="healthInsurance.provider"
                className={styles.input}
                placeholder="Enter your insurance provider"
              />
              <ErrorMessage name="healthInsurance.provider" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="healthInsurance.plan" className={classNames(styles.label, styles.required)}>
                Health Insurance Plan
              </label>
              <Field
                type="text"
                id="healthInsurance.plan"
                name="healthInsurance.plan"
                className={styles.input}
                placeholder="Enter your insurance plan"
              />
              <ErrorMessage name="healthInsurance.plan" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="healthInsurance.insuranceNumber" className={classNames(styles.label, styles.required)}>
                Health Insurance Number
              </label>
              <Field
                type="text"
                id="healthInsurance.insuranceNumber"
                name="healthInsurance.insuranceNumber"
                className={styles.input}
                placeholder="Enter your insurance number"
              />
              <ErrorMessage name="healthInsurance.insuranceNumber" component="div" className={styles.error} />
            </div>

            <h3 className={styles.subHeading}>Emergency Contact Information</h3>

            <div className={styles.formGroup}>
              <label htmlFor="healthInsurance.emergencyContactName" className={classNames(styles.label, styles.required)}>
                Emergency Contact Name
              </label>
              <Field
                type="text"
                id="healthInsurance.emergencyContactName"
                name="healthInsurance.emergencyContactName"
                className={styles.input}
                placeholder="Enter emergency contact name"
              />
              <ErrorMessage name="healthInsurance.emergencyContactName" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="healthInsurance.emergencyContactNumber" className={classNames(styles.label, styles.required)}>
                Emergency Contact Number
              </label>
              <Field
                type="tel"
                id="healthInsurance.emergencyContactNumber"
                name="healthInsurance.emergencyContactNumber"
                className={styles.input}
                placeholder="Enter emergency contact number"
              />
              <ErrorMessage name="healthInsurance.emergencyContactNumber" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="healthInsurance.emergencyContactRelationship" className={classNames(styles.label, styles.required)}>
                Emergency Contact Relationship
              </label>
              <Field
                type="text"
                id="healthInsurance.emergencyContactRelationship"
                name="healthInsurance.emergencyContactRelationship"
                className={styles.input}
                placeholder="Enter relationship to emergency contact"
              />
              <ErrorMessage name="healthInsurance.emergencyContactRelationship" component="div" className={styles.error} />
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

export default HealthInsuranceStep; 