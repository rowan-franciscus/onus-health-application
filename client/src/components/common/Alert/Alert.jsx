import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './Alert.module.css';

/**
 * Alert component for displaying notifications and messages
 */
const Alert = ({
  children,
  variant = 'info',
  title,
  dismissible = false,
  onDismiss,
  className = '',
  ...props
}) => {
  const alertClasses = classNames(
    styles.alert,
    {
      [styles.info]: variant === 'info',
      [styles.success]: variant === 'success',
      [styles.warning]: variant === 'warning',
      [styles.error]: variant === 'error',
    },
    className
  );

  return (
    <div className={alertClasses} role="alert" {...props}>
      <div className={styles.content}>
        {title && <div className={styles.title}>{title}</div>}
        <div className={styles.message}>{children}</div>
      </div>
      {dismissible && onDismiss && (
        <button 
          className={styles.closeButton} 
          onClick={onDismiss} 
          aria-label="Dismiss alert"
        >
          &times;
        </button>
      )}
    </div>
  );
};

Alert.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['info', 'success', 'warning', 'error']),
  title: PropTypes.string,
  dismissible: PropTypes.bool,
  onDismiss: PropTypes.func,
  className: PropTypes.string,
};

export default Alert; 