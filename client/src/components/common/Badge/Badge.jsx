import React from 'react';
import styles from './Badge.module.css';

const Badge = ({ variant = 'default', children, className = '' }) => {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
