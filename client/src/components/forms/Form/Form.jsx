import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './Form.module.css';

/**
 * Form container component with built-in layout and validation support
 */
const Form = ({
  children,
  onSubmit,
  className = '',
  layout = 'vertical',
  labelWidth,
  ...props
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  const formClasses = classNames(
    styles.form,
    {
      [styles.horizontal]: layout === 'horizontal',
    },
    className
  );

  // Set CSS variable for label width in horizontal layout
  const formStyle = layout === 'horizontal' && labelWidth ? { '--label-width': labelWidth } : {};

  return (
    <form 
      className={formClasses} 
      onSubmit={handleSubmit} 
      style={formStyle}
      noValidate
      {...props}
    >
      {children}
    </form>
  );
};

Form.propTypes = {
  children: PropTypes.node.isRequired,
  onSubmit: PropTypes.func,
  className: PropTypes.string,
  layout: PropTypes.oneOf(['vertical', 'horizontal']),
  labelWidth: PropTypes.string,
};

/**
 * Form.Item component for wrapping form controls
 */
const FormItem = ({
  children,
  label,
  htmlFor,
  required = false,
  error,
  hint,
  className = '',
  ...props
}) => {
  const formItemClasses = classNames(
    styles.formItem,
    {
      [styles.hasError]: error,
    },
    className
  );

  return (
    <div className={formItemClasses} {...props}>
      {label && (
        <label htmlFor={htmlFor} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.control}>
        {children}
        {error && <div className={styles.error}>{error}</div>}
        {hint && !error && <div className={styles.hint}>{hint}</div>}
      </div>
    </div>
  );
};

FormItem.propTypes = {
  children: PropTypes.node.isRequired,
  label: PropTypes.node,
  htmlFor: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.string,
  hint: PropTypes.node,
  className: PropTypes.string,
};

/**
 * Form.Group component for grouping related form controls
 */
const FormGroup = ({
  children,
  title,
  description,
  className = '',
  ...props
}) => {
  return (
    <div className={classNames(styles.formGroup, className)} {...props}>
      {title && <h3 className={styles.groupTitle}>{title}</h3>}
      {description && <p className={styles.groupDescription}>{description}</p>}
      <div className={styles.groupContent}>
        {children}
      </div>
    </div>
  );
};

FormGroup.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.node,
  description: PropTypes.node,
  className: PropTypes.string,
};

// Add sub-components to Form
Form.Item = FormItem;
Form.Group = FormGroup;

export default Form; 