import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './Radio.module.css';

/**
 * Radio input component
 */
const Radio = ({
  id,
  name,
  label,
  checked = false,
  value,
  disabled = false,
  onChange,
  className = '',
  ...props
}) => {
  const radioClasses = classNames(
    styles.radio,
    {
      [styles.disabled]: disabled,
    },
    className
  );

  return (
    <label className={radioClasses}>
      <input
        type="radio"
        id={id || name}
        name={name}
        checked={checked}
        value={value}
        disabled={disabled}
        onChange={onChange}
        className={styles.input}
        {...props}
      />
      <span className={styles.control}></span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
};

Radio.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  label: PropTypes.node,
  checked: PropTypes.bool,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  className: PropTypes.string,
};

/**
 * RadioGroup component for grouping multiple radio inputs
 */
const RadioGroup = ({
  name,
  options = [],
  value,
  onChange,
  disabled = false,
  className = '',
  ...props
}) => {
  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value, name);
    }
  };

  return (
    <div className={classNames(styles.group, className)} {...props}>
      {options.map((option) => (
        <Radio
          key={option.value}
          name={name}
          label={option.label}
          value={option.value}
          checked={value === option.value}
          disabled={option.disabled || disabled}
          onChange={handleChange}
        />
      ))}
    </div>
  );
};

RadioGroup.propTypes = {
  name: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.node.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]).isRequired,
      disabled: PropTypes.bool,
    })
  ),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

// Add RadioGroup to Radio
Radio.Group = RadioGroup;

export default Radio; 