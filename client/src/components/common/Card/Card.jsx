import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './Card.module.css';

/**
 * Card component for displaying content in a box with optional header and footer
 */
const Card = ({ children, className, ...props }) => {
  return (
    <div className={classNames(styles.card, className)} {...props}>
      {children}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default Card; 