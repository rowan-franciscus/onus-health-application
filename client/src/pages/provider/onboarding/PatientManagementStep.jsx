import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import classNames from 'classnames';
import validation from '../../../utils/validation';
import styles from '../../shared/FormStep.module.css';

const PatientManagementStep = ({ formData, onStepChange, next, previous, isSubmitting }) => {
  const validationSchema = Yup.object().shape({
    patientManagement: validation.provider.onboarding.patientManagement
  });

  const initialValues = {
    patientManagement: formData.patientManagement || {
      averagePatients: '',
      collaboration: false,
    }
  };

  const handleSubmit = (values) => {
    // Ensure averagePatients is a number
    if (values.patientManagement) {
      values.patientManagement.averagePatients = 
        parseInt(values.patientManagement.averagePatients) || 0;
    }
    onStepChange(values);
    next();
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepHeading}>Patient Management Details</h2>
      
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ errors, touched, values, setFieldValue }) => (
          <Form>
            <div className={styles.formGroup}>
              <label htmlFor="patientManagement.averagePatients" className={classNames(styles.label, styles.required)}>
                Average number of patients managed per week
              </label>
              <Field
                type="number"
                min="0"
                id="patientManagement.averagePatients"
                name="patientManagement.averagePatients"
                className={styles.input}
                placeholder="Enter approximate number of patients seen weekly"
              />
              <ErrorMessage name="patientManagement.averagePatients" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label className={classNames(styles.label, styles.required)}>
                Do you currently collaborate with other specialists or departments?
              </label>
              
              <div className={styles.radioGroup}>
                <div className={styles.radioOption}>
                  <Field
                    type="radio"
                    id="collaboration-yes"
                    name="patientManagement.collaboration"
                    value="true"
                    checked={values.patientManagement.collaboration === true}
                    onChange={() => setFieldValue('patientManagement.collaboration', true)}
                  />
                  <label htmlFor="collaboration-yes">Yes</label>
                </div>
                
                <div className={styles.radioOption}>
                  <Field
                    type="radio"
                    id="collaboration-no"
                    name="patientManagement.collaboration"
                    value="false"
                    checked={values.patientManagement.collaboration === false}
                    onChange={() => setFieldValue('patientManagement.collaboration', false)}
                  />
                  <label htmlFor="collaboration-no">No</label>
                </div>
              </div>
              
              <ErrorMessage name="patientManagement.collaboration" component="div" className={styles.error} />
              <p className={styles.fieldDescription}>
                This information helps us understand your practice workflow and optimize the platform for your needs.
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

export default PatientManagementStep; 