import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import classNames from 'classnames';
import validation from '../../../utils/validation';
import styles from '../../shared/FormStep.module.css';

const SupportCommunicationStep = ({ formData, onStepChange, next, previous, isSubmitting }) => {
  const validationSchema = Yup.object().shape({
    supportCommunication: validation.provider.onboarding.supportCommunication
  });

  const initialValues = {
    supportCommunication: formData.supportCommunication || {
      technicalSupport: '',
      training: '',
      updates: '',
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
              <label htmlFor="supportCommunication.technicalSupport" className={classNames(styles.label, styles.required)}>
                How would you prefer to receive technical support (e.g. in person, phone, email)?
              </label>
              <Field
                type="text"
                id="supportCommunication.technicalSupport"
                name="supportCommunication.technicalSupport"
                className={styles.input}
                placeholder="Enter your preferred support method"
              />
              <ErrorMessage name="supportCommunication.technicalSupport" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="supportCommunication.training" className={classNames(styles.label, styles.required)}>
                Would you require training on how to use the Onus platform?
              </label>
              <Field
                as="select"
                id="supportCommunication.training"
                name="supportCommunication.training"
                className={styles.select}
              >
                <option value="">Please select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Field>
              <ErrorMessage name="supportCommunication.training" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="supportCommunication.updates" className={classNames(styles.label, styles.required)}>
                How would you like to receive updates about new features or platform changes (e.g. email, in-platform notification)?
              </label>
              <Field
                type="text"
                id="supportCommunication.updates"
                name="supportCommunication.updates"
                className={styles.input}
                placeholder="Enter your preferred method for receiving updates"
              />
              <ErrorMessage name="supportCommunication.updates" component="div" className={styles.error} />
              <p className={styles.fieldDescription}>
                Your preferences help us tailor our support services to best meet your needs.
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
                {isSubmitting ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default SupportCommunicationStep; 