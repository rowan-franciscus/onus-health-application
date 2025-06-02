import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './Textarea.module.css';

/**
 * Textarea component for multi-line text input
 */
const Textarea = ({
  id,
  name,
  label,
  value,
  placeholder = '',
  rows = 4,
  disabled = false,
  readOnly = false,
  required = false,
  error = '',
  hint = '',
  className = '',
  onChange,
  onBlur,
  onFocus,
  ...props
}) => {
  const textareaClasses = classNames(
    styles.textarea,
    {
      [styles.hasError]: error,
      [styles.disabled]: disabled,
    },
    className
  );

  return (
    <div className={styles.textareaContainer}>
      {label && (
        <label htmlFor={id || name} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      
      <textarea
        id={id || name}
        name={name}
        className={textareaClasses}
        value={value}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
      
      {error && (
        <div id={`${name}-error`} className={styles.error}>
          {error}
        </div>
      )}
      
      {hint && !error && (
        <div className={styles.hint}>
          {hint}
        </div>
      )}
    </div>
  );
};

Textarea.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  label: PropTypes.string,
  value: PropTypes.string,
  placeholder: PropTypes.string,
  rows: PropTypes.number,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  required: PropTypes.bool,
  error: PropTypes.string,
  hint: PropTypes.string,
  className: PropTypes.string,
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
};

export default Textarea; 