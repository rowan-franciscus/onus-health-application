import React from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import styles from './Breadcrumb.module.css';

/**
 * Breadcrumb navigation component
 */
const Breadcrumb = ({ items = [], className = '' }) => {
  const location = useLocation();
  
  // If no items provided, generate from current path
  const breadcrumbItems = items.length > 0 ? items : generateBreadcrumbItems(location.pathname);
  
  return (
    <nav className={`${styles.breadcrumb} ${className}`} aria-label="breadcrumb">
      <ol className={styles.breadcrumbList}>
        {breadcrumbItems.map((item, index) => (
          <li 
            key={index} 
            className={`${styles.breadcrumbItem} ${index === breadcrumbItems.length - 1 ? styles.active : ''}`}
          >
            {index < breadcrumbItems.length - 1 ? (
              <Link to={item.path} className={styles.breadcrumbLink}>
                {item.label}
              </Link>
            ) : (
              <span className={styles.breadcrumbText}>{item.label}</span>
            )}
            {index < breadcrumbItems.length - 1 && (
              <span className={styles.separator}>/</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

/**
 * Generate breadcrumb items from a path
 * @param {string} path - The current path
 * @returns {Array} - Array of breadcrumb items
 */
const generateBreadcrumbItems = (path) => {
  const parts = path.split('/').filter(Boolean);
  let currentPath = '';
  
  return parts.map((part, index) => {
    currentPath += `/${part}`;
    // Convert path segment to readable label
    const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
    
    return {
      label,
      path: currentPath
    };
  });
};

Breadcrumb.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired,
    })
  ),
  className: PropTypes.string,
};

export default Breadcrumb; 