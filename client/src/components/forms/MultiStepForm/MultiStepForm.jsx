import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './MultiStepForm.module.css';

/**
 * MultiStepForm component for multi-step form navigation
 */
const MultiStepForm = ({
  steps,
  initialStep = 0,
  onSubmit,
  className = '',
  children,
  ...props
}) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset to initial step if initialStep prop changes
  useEffect(() => {
    setCurrentStep(initialStep);
  }, [initialStep]);

  const goToStep = (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
    }
  };

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previous = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepChange = (data = {}) => {
    setFormData(prevData => ({
      ...prevData,
      ...data
    }));
  };

  const handleSubmit = async () => {
    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(formData);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const renderStepContent = () => {
    const step = steps[currentStep];
    if (!step) return null;

    const StepComponent = step.component;
    return (
      <StepComponent
        formData={formData}
        onStepChange={handleStepChange}
        next={next}
        previous={previous}
        isFirstStep={currentStep === 0}
        isLastStep={currentStep === steps.length - 1}
        goToStep={goToStep}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    );
  };

  return (
    <div className={classNames(styles.multiStepForm, className)} {...props}>
      <div className={styles.steps}>
        <div className={styles.stepConnector}></div>
        {steps.map((step, index) => (
          <div
            key={index}
            className={classNames(styles.step, {
              [styles.active]: index === currentStep,
              [styles.completed]: index < currentStep,
            })}
          >
            <div className={styles.stepIndicator}>
              {index < currentStep ? (
                <span className={styles.stepCheckmark}>✓</span>
              ) : (
                <span className={styles.stepNumber}>{index + 1}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.currentStep}>
        <h4>{steps[currentStep]?.title}</h4>
      </div>
      <div className={styles.stepBody}>
        {renderStepContent()}
      </div>
    </div>
  );
};

MultiStepForm.propTypes = {
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
      component: PropTypes.elementType.isRequired,
    })
  ).isRequired,
  initialStep: PropTypes.number,
  onSubmit: PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.node,
};

export default MultiStepForm; 