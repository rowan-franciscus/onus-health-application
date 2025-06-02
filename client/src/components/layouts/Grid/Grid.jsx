import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './Grid.module.css';

/**
 * Grid container component for responsive layouts
 */
const Grid = ({
  children,
  container = false,
  item = false,
  spacing = 0,
  justifyContent = 'flex-start',
  alignItems = 'flex-start',
  xs,
  sm,
  md,
  lg,
  xl,
  className = '',
  ...props
}) => {
  const gridClasses = classNames(
    {
      [styles.container]: container,
      [styles.item]: item,
      [styles[`spacing-${spacing}`]]: container && spacing > 0,
      [styles[`justify-${justifyContent}`]]: container && justifyContent,
      [styles[`align-${alignItems}`]]: container && alignItems,
      [styles[`xs-${xs}`]]: xs,
      [styles[`sm-${sm}`]]: sm,
      [styles[`md-${md}`]]: md,
      [styles[`lg-${lg}`]]: lg,
      [styles[`xl-${xl}`]]: xl,
    },
    className
  );

  return (
    <div className={gridClasses} {...props}>
      {children}
    </div>
  );
};

Grid.propTypes = {
  children: PropTypes.node,
  container: PropTypes.bool,
  item: PropTypes.bool,
  spacing: PropTypes.oneOf([0, 1, 2, 3, 4, 5, 6, 8, 10]),
  justifyContent: PropTypes.oneOf([
    'flex-start',
    'center',
    'flex-end',
    'space-between',
    'space-around',
    'space-evenly'
  ]),
  alignItems: PropTypes.oneOf([
    'flex-start',
    'center',
    'flex-end',
    'stretch',
    'baseline'
  ]),
  xs: PropTypes.oneOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 'auto']),
  sm: PropTypes.oneOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 'auto']),
  md: PropTypes.oneOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 'auto']),
  lg: PropTypes.oneOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 'auto']),
  xl: PropTypes.oneOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 'auto']),
  className: PropTypes.string,
};

/**
 * Grid.Row component for creating a grid row
 */
const Row = ({ children, className = '', ...props }) => {
  return (
    <div className={classNames(styles.row, className)} {...props}>
      {children}
    </div>
  );
};

Row.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

/**
 * Grid.Column component for creating a grid column
 */
const Column = ({
  children,
  xs = 12,
  sm,
  md,
  lg,
  xl,
  className = '',
  ...props
}) => {
  const colClasses = classNames(
    styles.col,
    {
      [styles[`col-xs-${xs}`]]: xs,
      [styles[`col-sm-${sm}`]]: sm,
      [styles[`col-md-${md}`]]: md,
      [styles[`col-lg-${lg}`]]: lg,
      [styles[`col-xl-${xl}`]]: xl,
    },
    className
  );

  return (
    <div className={colClasses} {...props}>
      {children}
    </div>
  );
};

Column.propTypes = {
  children: PropTypes.node,
  xs: PropTypes.oneOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
  sm: PropTypes.oneOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
  md: PropTypes.oneOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
  lg: PropTypes.oneOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
  xl: PropTypes.oneOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
  className: PropTypes.string,
};

// Add subcomponents to Grid
Grid.Row = Row;
Grid.Column = Column;

export default Grid; 