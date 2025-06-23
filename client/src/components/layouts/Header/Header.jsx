import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { getUserInitials } from '../../../utils/initials';
import styles from './Header.module.css';

/**
 * Header component for the application dashboard
 */
const Header = ({
  title,
  actions,
  user,
  onUserMenuClick,
  className = '',
  ...props
}) => {
  // Get current date for the date picker
  const getCurrentFormattedDate = () => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 30); // Default to last 30 days
    
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return `[Start Date] - [End Date]`;
  };

  return (
    <header className={classNames(styles.header, className)} {...props}>
      <div className={styles.titleContainer}>
        {title && <h1 className={styles.title}>{title}</h1>}
      </div>
      <div className={styles.actions}>
        {title === 'Analytics' && (
          <div className={styles.dateRangePicker}>
            <input 
              type="text" 
              value={getCurrentFormattedDate()} 
              readOnly 
              className={styles.dateInput}
            />
            <button className={styles.refreshButton}>Refresh</button>
          </div>
        )}
        
        {title === 'All Patients' && (
          <div className={styles.searchContainer}>
            <input 
              type="text" 
              placeholder="Search" 
              className={styles.searchInput}
            />
            <button className={styles.addButton}>+ Add New Patient</button>
          </div>
        )}
        
        {title === 'Consultations' && (
          <div className={styles.searchContainer}>
            <input 
              type="text" 
              placeholder="Search" 
              className={styles.searchInput}
            />
          </div>
        )}
        
        {actions}
        
        {user && (
          <Link 
            to={user.profileUrl || '#'} 
            className={styles.userMenu}
          >
            <div className={styles.avatar}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={`${user.name || 'User'}'s avatar`} className={styles.avatarImage} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {getUserInitials(user.firstName, user.lastName, user.name)}
                </div>
              )}
            </div>
            {user.name && <span className={styles.userName}>{user.name}</span>}
          </Link>
        )}
      </div>
    </header>
  );
};

Header.propTypes = {
  title: PropTypes.node,
  actions: PropTypes.node,
  user: PropTypes.shape({
    name: PropTypes.string,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    avatarUrl: PropTypes.string,
    profileUrl: PropTypes.string,
  }),
  onUserMenuClick: PropTypes.func,
  className: PropTypes.string,
};

export default Header; 