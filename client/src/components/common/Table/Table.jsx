import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import styles from './Table.module.css';

/**
 * Table component for displaying data in rows and columns
 */
const Table = ({ 
  columns, 
  data, 
  emptyMessage = 'No data available',
  className = '',
  striped = false,
  hoverable = true,
  bordered = false,
  compact = false,
  ...props
}) => {
  const tableClasses = classNames(
    styles.table,
    {
      [styles.striped]: striped,
      [styles.hoverable]: hoverable,
      [styles.bordered]: bordered,
      [styles.compact]: compact,
    },
    className
  );

  // Normalize column property names to support both naming conventions
  const normalizedColumns = columns.map(column => ({
    ...column,
    title: column.title || column.header,
    dataIndex: column.dataIndex || column.accessor
  }));

  return (
    <div className={styles.tableContainer}>
      <table className={tableClasses} {...props}>
        <thead className={styles.thead}>
          <tr>
            {normalizedColumns.map((column, index) => (
              <th 
                key={index} 
                className={classNames(styles.th, {
                  [styles.alignLeft]: column.align === 'left' || !column.align,
                  [styles.alignCenter]: column.align === 'center',
                  [styles.alignRight]: column.align === 'right',
                })}
                style={{ width: column.width || 'auto' }}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr key={rowIndex} className={styles.tr}>
                {normalizedColumns.map((column, colIndex) => {
                  // Safely get cell value
                  const cellValue = row[column.dataIndex];
                  
                  return (
                    <td 
                      key={colIndex} 
                      className={classNames(styles.td, {
                        [styles.alignLeft]: column.align === 'left' || !column.align,
                        [styles.alignCenter]: column.align === 'center',
                        [styles.alignRight]: column.align === 'right',
                      })}
                    >
                      {column.render ? column.render(cellValue, row, rowIndex) : cellValue}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={normalizedColumns.length} className={styles.emptyMessage}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

Table.propTypes = {
  /**
   * Array of column objects
   * { title|header, dataIndex|accessor, render, align, width }
   */
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.node,
      header: PropTypes.node,
      dataIndex: PropTypes.string,
      accessor: PropTypes.string,
      render: PropTypes.func,
      align: PropTypes.oneOf(['left', 'center', 'right']),
      width: PropTypes.string,
    })
  ).isRequired,
  /**
   * Array of data objects
   */
  data: PropTypes.array.isRequired,
  /**
   * Message to display when data is empty
   */
  emptyMessage: PropTypes.node,
  /**
   * Additional CSS class name
   */
  className: PropTypes.string,
  /**
   * Whether to apply striped rows
   */
  striped: PropTypes.bool,
  /**
   * Whether to apply hover effect on rows
   */
  hoverable: PropTypes.bool,
  /**
   * Whether to show borders
   */
  bordered: PropTypes.bool,
  /**
   * Whether to use compact styling
   */
  compact: PropTypes.bool,
};

export default Table; 