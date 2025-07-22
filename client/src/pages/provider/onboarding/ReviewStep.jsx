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

    const isFile = (value) => value instanceof File;

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
              <span className={styles.reviewItemValue}>
                {isFile(value) ? value.name : (value || 'Not provided')}
              </span>
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
        click "Submit" to complete your provider profile.
      </p>
      
      <form onSubmit={handleSubmit}>
        {renderSection('Professional Information', formData.professionalInfo, 0)}
        {renderSection('Practice Information', formData.practiceInfo, 1)}
        {renderSection('Patient Management Details', formData.patientManagement, 2)}
        {renderSection('Data & Access Preferences', formData.dataAccess, 3)}
        {renderSection('Data Sharing & Privacy Practices', formData.dataSharing, 4)}
        {renderSection('Support & Communication', formData.supportCommunication, 5)}

        {/* Terms and Conditions Acceptance */}
        {formData.termsAccepted && (
          <div className={styles.reviewSection}>
            <div className={styles.reviewSectionHeader}>
              <h3 className={styles.reviewSectionTitle}>Terms & Conditions</h3>
              <button
                type="button"
                onClick={() => goToStep(6)}
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
            Your profile will be reviewed by our administrative team for verification before you can access the full platform features.
            You will receive an email notification once your profile has been verified.
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