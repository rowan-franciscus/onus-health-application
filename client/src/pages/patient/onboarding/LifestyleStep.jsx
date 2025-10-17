import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import classNames from 'classnames';
import validation from '../../../utils/validation';
import styles from '../../shared/FormStep.module.css';

const LifestyleStep = ({ formData, onStepChange, next, previous, isSubmitting }) => {
  const validationSchema = Yup.object().shape({
    lifestyle: validation.patient.onboarding.lifestyle
  });

  const initialValues = {
    lifestyle: formData.lifestyle || {
      smoking: '',
      alcohol: '',
      exercise: '',
      dietaryPreferences: '',
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
              <label htmlFor="lifestyle.smoking" className={styles.label}>
                Do you smoke? If yes, how frequently?
              </label>
              <Field
                type="text"
                id="lifestyle.smoking"
                name="lifestyle.smoking"
                className={styles.input}
                placeholder="E.g. No / Yes, 5 cigarettes daily / Quit 2 years ago"
              />
              <ErrorMessage name="lifestyle.smoking" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lifestyle.alcohol" className={styles.label}>
                Do you consume alcohol? If yes, how frequently?
              </label>
              <Field
                type="text"
                id="lifestyle.alcohol"
                name="lifestyle.alcohol"
                className={styles.input}
                placeholder="E.g. No / Yes, socially on weekends / 1-2 glasses of wine daily"
              />
              <ErrorMessage name="lifestyle.alcohol" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lifestyle.exercise" className={styles.label}>
                Do you exercise? What type and how frequently?
              </label>
              <Field
                type="text"
                id="lifestyle.exercise"
                name="lifestyle.exercise"
                className={styles.input}
                placeholder="E.g. Walking 30 minutes daily / Gym 3 times a week / No regular exercise"
              />
              <ErrorMessage name="lifestyle.exercise" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lifestyle.dietaryPreferences" className={styles.label}>
                Dietary preferences or restrictions (e.g. vegetarian, vegan, keto, carnivore)?
              </label>
              <Field
                type="text"
                id="lifestyle.dietaryPreferences"
                name="lifestyle.dietaryPreferences"
                className={styles.input}
                placeholder="E.g. Vegetarian / No restrictions / Gluten-free"
              />
              <ErrorMessage name="lifestyle.dietaryPreferences" component="div" className={styles.error} />
              <p className={styles.fieldDescription}>
                This information helps your healthcare provider offer lifestyle advice that's compatible with your current habits.
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

export default LifestyleStep; 