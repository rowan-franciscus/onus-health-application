import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './Select.module.css';

/**
 * Select component for dropdowns
 */
const Select = ({
  id,
  name,
  label,
  options = [],
  value,
  defaultValue,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  required = false,
  error = '',
  hint = '',
  className = '',
  ...props
}) => {
  const selectClasses = classNames(
    styles.select,
    {
      [styles.hasError]: error,
      [styles.disabled]: disabled,
    },
    className
  );

  return (
    <div className={styles.selectContainer}>
      {label && (
        <label htmlFor={id || name} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      
      <div className={styles.selectWrapper}>
        <select
          id={id || name}
          name={name}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          disabled={disabled}
          className={selectClasses}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <div className={styles.arrow}></div>
      </div>
      
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

Select.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  label: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      disabled: PropTypes.bool,
    })
  ),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  error: PropTypes.string,
  hint: PropTypes.string,
  className: PropTypes.string,
};

export default Select; 