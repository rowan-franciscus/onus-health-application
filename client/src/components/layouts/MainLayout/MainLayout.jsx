import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Sidebar from '../Sidebar';
import Header from '../Header';
import styles from './MainLayout.module.css';

/**
 * MainLayout component combining Sidebar and content area with responsive design
 */
const MainLayout = ({
  children,
  sidebarItems = [],
  sidebarFooterItems = [],
  sidebarLogo,
  headerTitle,
  headerActions,
  user,
  onUserMenuClick,
  className = '',
  contentClassName = '',
  ...props
}) => {
  return (
    <div className={classNames(styles.layout, className)} {...props}>
      <Sidebar
        logo={sidebarLogo}
        items={sidebarItems}
        footerItems={sidebarFooterItems}
        className={styles.sidebar}
      />
      <div className={styles.mainContent}>
        <Header
          title={headerTitle}
          actions={headerActions}
          user={user}
          onUserMenuClick={onUserMenuClick}
          className={styles.header}
        />
        <main className={classNames(styles.content, contentClassName)}>
          {children}
        </main>
      </div>
    </div>
  );
};

MainLayout.propTypes = {
  children: PropTypes.node.isRequired,
  sidebarItems: PropTypes.array,
  sidebarFooterItems: PropTypes.array,
  sidebarLogo: PropTypes.node,
  headerTitle: PropTypes.node,
  headerActions: PropTypes.node,
  user: PropTypes.object,
  onUserMenuClick: PropTypes.func,
  className: PropTypes.string,
  contentClassName: PropTypes.string,
};

export default MainLayout; 