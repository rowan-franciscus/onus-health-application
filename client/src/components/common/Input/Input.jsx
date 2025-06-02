import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './Input.module.css';

/**
 * Input component with support for validation and error messages
 */
const Input = ({
  id,
  name,
  type = 'text',
  label,
  value,
  placeholder = '',
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
  const inputClasses = classNames(
    styles.input,
    {
      [styles.hasError]: error,
      [styles.disabled]: disabled,
    },
    className
  );

  return (
    <div className={styles.inputContainer}>
      {label && (
        <label htmlFor={id || name} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      
      <input
        id={id || name}
        name={name}
        type={type}
        className={inputClasses}
        value={value}
        placeholder={placeholder}
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

Input.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  type: PropTypes.oneOf([
    'text',
    'password',
    'email',
    'number',
    'tel',
    'url',
    'date',
    'time',
    'datetime-local',
    'search',
  ]),
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  placeholder: PropTypes.string,
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

export default Input; 