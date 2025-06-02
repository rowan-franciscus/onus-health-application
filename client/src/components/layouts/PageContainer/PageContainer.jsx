import React from 'react';
import PropTypes from 'prop-types';
import Breadcrumb from '../../common/Breadcrumb';
import styles from './PageContainer.module.css';

/**
 * Container component for page content with consistent styling
 */
const PageContainer = ({
  title,
  breadcrumbItems,
  actions,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`${styles.pageContainer} ${className}`} {...props}>
      <div className={styles.pageHeader}>
        {breadcrumbItems && <Breadcrumb items={breadcrumbItems} className={styles.breadcrumb} />}
        
        <div className={styles.titleRow}>
          {title && <h2 className={styles.pageTitle}>{title}</h2>}
          {actions && <div className={styles.pageActions}>{actions}</div>}
        </div>
      </div>
      
      <div className={styles.pageContent}>
        {children}
      </div>
    </div>
  );
};

PageContainer.propTypes = {
  title: PropTypes.node,
  breadcrumbItems: PropTypes.array,
  actions: PropTypes.node,
  children: PropTypes.node,
  className: PropTypes.string,
};

export default PageContainer; 