import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import classNames from 'classnames';
import validation from '../../../utils/validation';
import styles from '../../shared/FormStep.module.css';

const DataSharingStep = ({ formData, onStepChange, next, previous, isSubmitting }) => {
  const validationSchema = Yup.object().shape({
    dataSharing: validation.provider.onboarding.dataSharing
  });

  const initialValues = {
    dataSharing: formData.dataSharing || {
      privacyPractices: '',
    }
  };

  const handleSubmit = (values) => {
    onStepChange(values);
    next();
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepHeading}>Data Sharing & Privacy Practices</h2>
      
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ errors, touched }) => (
          <Form>
            <div className={styles.formGroup}>
              <label htmlFor="dataSharing.privacyPractices" className={classNames(styles.label, styles.required)}>
                Are there specific data security or privacy practices you need to adhere to in your current practice?
              </label>
              <Field
                as="textarea"
                id="dataSharing.privacyPractices"
                name="dataSharing.privacyPractices"
                className={styles.textarea}
                placeholder="Describe any specific privacy regulations, practices, or policies you follow beyond standard HIPAA compliance"
              />
              <ErrorMessage name="dataSharing.privacyPractices" component="div" className={styles.error} />
              <p className={styles.fieldDescription}>
                Understanding your specific privacy requirements helps us ensure our platform supports 
                your compliance needs. All data on the Onus platform is managed according to HIPAA standards
                at minimum, with additional protections available as needed.
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

export default DataSharingStep; 