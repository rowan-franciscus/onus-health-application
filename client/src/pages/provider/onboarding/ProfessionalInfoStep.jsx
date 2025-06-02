import React, { useState, useRef } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import classNames from 'classnames';
import validation from '../../../utils/validation';
import styles from '../../shared/FormStep.module.css';

const ProfessionalInfoStep = ({ formData, onStepChange, next, isSubmitting }) => {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  
  const validationSchema = Yup.object().shape({
    professionalInfo: validation.provider.onboarding.professionalInfo
  });

  const initialValues = {
    professionalInfo: formData.professionalInfo || {
      title: '',
      specialty: '',
      yearsOfExperience: '',
      practiceLicense: null,
    }
  };

  const handleFileChange = (event, setFieldValue) => {
    const file = event.currentTarget.files[0];
    if (file) {
      setFileName(file.name);
      setFieldValue('professionalInfo.practiceLicense', file);
    }
  };

  const removeFile = (setFieldValue) => {
    setFileName('');
    setFieldValue('professionalInfo.practiceLicense', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (values) => {
    onStepChange(values);
    next();
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepHeading}>Professional Information</h2>
      
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isValid, dirty, errors, touched, setFieldValue }) => (
          <Form>
            <div className={styles.formRow}>
              <div className={styles.formCol}>
                <div className={styles.formGroup}>
                  <label htmlFor="professionalInfo.title" className={classNames(styles.label, styles.required)}>
                    Title
                  </label>
                  <Field
                    as="select"
                    id="professionalInfo.title"
                    name="professionalInfo.title"
                    className={styles.select}
                  >
                    <option value="">Select title</option>
                    <option value="Dr">Dr</option>
                    <option value="Prof">Prof</option>
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                  </Field>
                  <ErrorMessage name="professionalInfo.title" component="div" className={styles.error} />
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="professionalInfo.specialty" className={classNames(styles.label, styles.required)}>
                Specialty (e.g. General Practitioner, Cardiologist, Dentist)
              </label>
              <Field
                type="text"
                id="professionalInfo.specialty"
                name="professionalInfo.specialty"
                className={styles.input}
                placeholder="Enter your medical specialty"
              />
              <ErrorMessage name="professionalInfo.specialty" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="professionalInfo.yearsOfExperience" className={classNames(styles.label, styles.required)}>
                Years of Experience in Practice
              </label>
              <Field
                type="number"
                id="professionalInfo.yearsOfExperience"
                name="professionalInfo.yearsOfExperience"
                min="0"
                className={styles.input}
                placeholder="Enter years of professional experience"
              />
              <ErrorMessage name="professionalInfo.yearsOfExperience" component="div" className={styles.error} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="professionalInfo.practiceLicense" className={classNames(styles.label, styles.required)}>
                Practice License
              </label>
              <input
                type="file"
                id="fileInput"
                ref={fileInputRef}
                className={styles.fileInput}
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, setFieldValue)}
              />
              <label htmlFor="fileInput" className={styles.uploadButton}>
                Upload Practice License
              </label>
              {fileName && (
                <div className={styles.filePreview}>
                  <span>{fileName}</span>
                  <button
                    type="button"
                    className={styles.removeFileButton}
                    onClick={() => removeFile(setFieldValue)}
                  >
                    Remove
                  </button>
                </div>
              )}
              <ErrorMessage name="professionalInfo.practiceLicense" component="div" className={styles.error} />
              <p className={styles.fieldDescription}>
                Please upload a copy of your medical practice license or certification.
                Accepted formats: PDF, JPG, PNG. Maximum file size: 5MB.
              </p>
            </div>

            <div className={styles.buttonGroup}>
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

export default ProfessionalInfoStep; 