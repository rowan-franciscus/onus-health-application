import React from 'react';
import styles from './LoadingSpinner.module.css';

/**
 * LoadingSpinner - A reusable loading spinner component
 * @param {Object} props
 * @param {string} [props.size='medium'] - Size of the spinner (small, medium, large)
 * @param {string} [props.color='primary'] - Color of the spinner (primary, secondary, white)
 * @param {string} [props.className] - Additional CSS class
 */
const LoadingSpinner = ({ size = 'medium', color = 'primary', className }) => {
  const spinnerClasses = [
    styles.spinner,
    styles[`size-${size}`],
    styles[`color-${color}`],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={spinnerClasses}>
      <div className={styles.bounce1}></div>
      <div className={styles.bounce2}></div>
      <div className={styles.bounce3}></div>
    </div>
  );
};

export default LoadingSpinner; 