import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './Checkbox.module.css';

/**
 * Checkbox input component
 */
const Checkbox = ({
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
  const checkboxClasses = classNames(
    styles.checkbox,
    {
      [styles.disabled]: disabled,
    },
    className
  );

  return (
    <label className={checkboxClasses}>
      <input
        type="checkbox"
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

Checkbox.propTypes = {
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
 * CheckboxGroup component for grouping multiple checkboxes
 */
const CheckboxGroup = ({
  name,
  options = [],
  value = [],
  onChange,
  disabled = false,
  className = '',
  ...props
}) => {
  const handleChange = (e) => {
    const { checked, value: optionValue } = e.target;
    
    if (!onChange) return;
    
    const newValue = [...value];
    
    if (checked) {
      if (!newValue.includes(optionValue)) {
        newValue.push(optionValue);
      }
    } else {
      const index = newValue.indexOf(optionValue);
      if (index !== -1) {
        newValue.splice(index, 1);
      }
    }
    
    onChange(newValue, name);
  };

  return (
    <div className={classNames(styles.group, className)} {...props}>
      {options.map((option) => (
        <Checkbox
          key={option.value}
          name={name}
          label={option.label}
          value={option.value}
          checked={value.includes(option.value)}
          disabled={option.disabled || disabled}
          onChange={handleChange}
        />
      ))}
    </div>
  );
};

CheckboxGroup.propTypes = {
  name: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.node.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]).isRequired,
      disabled: PropTypes.bool,
    })
  ),
  value: PropTypes.array,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

// Add CheckboxGroup to Checkbox
Checkbox.Group = CheckboxGroup;

export default Checkbox; 