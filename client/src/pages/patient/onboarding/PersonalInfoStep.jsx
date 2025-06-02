import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import classNames from 'classnames';
import validation from '../../../utils/validation';
import styles from '../../shared/FormStep.module.css';

const PersonalInfoStep = ({ formData, onStepChange, next, isSubmitting }) => {
  const validationSchema = Yup.object().shape({
    personalInfo: validation.patient.onboarding.personalInfo
  });

  const initialValues = {
    personalInfo: formData.personalInfo || {
      title: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      email: '',
      phone: '',
      address: '',
    }
  };

  const handleSubmit = (values) => {
    onStepChange(values);
    next();
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepHeading}>Personal Information</h2>
      
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isValid, dirty, errors, touched }) => (
          <Form>
            <div className={styles.formRow}>
              <div className={styles.formCol}>
                <div className={styles.formGroup}>
                  <label htmlFor="personalInfo.title" className={classNames(styles.label, styles.required)}>
                    Title
                  </label>
                  <Field
                    as="select"
                    id="personalInfo.title"
                    name="personalInfo.title"
                    className={styles.select}
                  >
                    <option value="">Select title</option>
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                    <option value="Dr">Dr</option>
                    <option value="Prof">Prof</option>
                  </Field>
                  <ErrorMessage name="personalInfo.title" component="div" className={styles.error} />
                </div>
              </div>

              <div className={styles.formCol}>
                <div className={styles.formGroup}>
                  <label htmlFor="personalInfo.gender" className={classNames(styles.label, styles.required)}>
                    Gender
                  </label>
                  <Field
                    as="select"
                    id="personalInfo.gender"
                    name="personalInfo.gender"
                    className={styles.select}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer not to say">Prefer not to say</option>
                  </Field>
                  <ErrorMessage name="personalInfo.gender" component="div" className={styles.error} />
                </div>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formCol}>
                <div className={styles.formGroup}>
                  <label htmlFor="personalInfo.firstName" className={classNames(styles.label, styles.required)}>
                    First Name
                  </label>
                  <Field
                    type="text"
                    id="personalInfo.firstName"
                    name="personalInfo.firstName"
                    className={styles.input}
                    placeholder="Enter your first name"
                  />
                  <ErrorMessage name="personalInfo.firstName" component="div" className={styles.error} />
                </div>
              </div>

              <div className={styles.formCol}>
                <div className={styles.formGroup}>
                  <label htmlFor="personalInfo.lastName" className={classNames(styles.label, styles.required)}>
                    Last Name
                  </label>
                  <Field
                    type="text"
                    id="personalInfo.lastName"
                    name="personalInfo.lastName"
                    className={styles.input}
                    placeholder="Enter your last name"
                  />
                  <ErrorMessage name="personalInfo.lastName" component="div" className={styles.error} />
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="personalInfo.dateOfBirth" className={classNames(styles.label, styles.required)}>
                Date of Birth
              </label>
              <Field
                type="date"
                id="personalInfo.dateOfBirth"
                name="personalInfo.dateOfBirth"
                className={styles.input}
              />
              <ErrorMessage name="personalInfo.dateOfBirth" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="personalInfo.email" className={classNames(styles.label, styles.required)}>
                Email
              </label>
              <Field
                type="email"
                id="personalInfo.email"
                name="personalInfo.email"
                className={styles.input}
                placeholder="Enter your email address"
              />
              <ErrorMessage name="personalInfo.email" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="personalInfo.phone" className={classNames(styles.label, styles.required)}>
                Phone Number
              </label>
              <Field
                type="tel"
                id="personalInfo.phone"
                name="personalInfo.phone"
                className={styles.input}
                placeholder="Enter your phone number"
              />
              <ErrorMessage name="personalInfo.phone" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="personalInfo.address" className={classNames(styles.label, styles.required)}>
                Address
              </label>
              <Field
                as="textarea"
                id="personalInfo.address"
                name="personalInfo.address"
                className={styles.textarea}
                placeholder="Enter your full address"
              />
              <ErrorMessage name="personalInfo.address" component="div" className={styles.error} />
            </div>

            <div className={styles.buttonGroup}>
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

export default PersonalInfoStep; 