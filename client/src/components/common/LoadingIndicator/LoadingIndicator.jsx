import React from 'react';
import PropTypes from 'prop-types';
import styles from './LoadingIndicator.module.css';

/**
 * Loading indicator component with different sizes and overlay options
 */
const LoadingIndicator = ({
  size = 'medium',
  overlay = false,
  text = 'Loading...',
  className = '',
}) => {
  const sizeClass = styles[size] || styles.medium;
  
  if (overlay) {
    return (
      <div className={styles.overlay}>
        <div className={`${styles.container} ${className}`}>
          <div className={`${styles.spinner} ${sizeClass}`} />
          {text && <div className={styles.text}>{text}</div>}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`${styles.container} ${className}`}>
      <div className={`${styles.spinner} ${sizeClass}`} />
      {text && <div className={styles.text}>{text}</div>}
    </div>
  );
};

LoadingIndicator.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  overlay: PropTypes.bool,
  text: PropTypes.string,
  className: PropTypes.string,
};

export default LoadingIndicator; 