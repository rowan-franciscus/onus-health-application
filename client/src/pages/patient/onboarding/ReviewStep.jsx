import React from 'react';
import classNames from 'classnames';
import styles from '../../shared/FormStep.module.css';

const ReviewStep = ({ formData, onStepChange, previous, onSubmit, isSubmitting, goToStep }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const renderSection = (title, data, step) => {
    if (!data) return null;

    return (
      <div className={styles.reviewSection}>
        <div className={styles.reviewSectionHeader}>
          <h3 className={styles.reviewSectionTitle}>{title}</h3>
          <button
            type="button"
            onClick={() => goToStep(step)}
            className={styles.editButton}
          >
            Edit
          </button>
        </div>
        <div className={styles.reviewSectionContent}>
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className={styles.reviewItem}>
              <span className={styles.reviewItemLabel}>
                {key.replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase())
                  .replace(/([a-z])([A-Z])/g, '$1 $2')}:
              </span>
              <span className={styles.reviewItemValue}>{value || 'Not provided'}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepHeading}>Review Your Information</h2>
      <p className={styles.reviewIntro}>
        Please review all your information below. If you need to make changes,
        click the "Edit" button next to the appropriate section. Once everything is correct,
        click "Submit" to complete your profile.
      </p>
      
      <form onSubmit={handleSubmit}>
        {renderSection('Personal Information', formData.personalInfo, 0)}
        {renderSection('Health Insurance', formData.healthInsurance, 1)}
        {renderSection('Medical History', formData.medicalHistory, 2)}
        {renderSection('Family History', formData.familyHistory, 3)}
        {renderSection('Current Medication', formData.currentMedication, 4)}
        {renderSection('Allergies', formData.allergies, 5)}
        {renderSection('Lifestyle & Habits', formData.lifestyle, 6)}
        {renderSection('Immunization', formData.immunization, 7)}

        {/* Terms and Conditions Acceptance */}
        {formData.termsAccepted && (
          <div className={styles.reviewSection}>
            <div className={styles.reviewSectionHeader}>
              <h3 className={styles.reviewSectionTitle}>Terms & Conditions</h3>
              <button
                type="button"
                onClick={() => goToStep(8)}
                className={styles.editButton}
              >
                Edit
              </button>
            </div>
            <div className={styles.reviewSectionContent}>
              <div className={styles.reviewItem}>
                <span className={styles.reviewItemLabel}>Acceptance Status:</span>
                <span className={styles.reviewItemValue}>
                  ✓ Terms and Conditions Accepted
                </span>
              </div>
            </div>
          </div>
        )}

        <div className={styles.privacyConsent}>
          <p>
            By submitting this form, you confirm that all the information provided is accurate to the best of your knowledge.
            Your health information will be stored securely and used only for the purpose of providing you with appropriate healthcare services.
            You can update your information at any time through your profile settings.
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
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewStep; 