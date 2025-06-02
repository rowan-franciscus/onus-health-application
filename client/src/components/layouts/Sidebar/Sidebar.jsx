import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import classNames from 'classnames';
import styles from './Sidebar.module.css';

/**
 * Sidebar component with fixed 250px width as specified in the design
 */
const Sidebar = ({
  logo,
  items = [],
  footerItems = [],
  className = '',
  ...props
}) => {
  return (
    <aside className={classNames(styles.sidebar, className)} {...props}>
      {logo && (
        <div className={styles.logo}>
          {logo}
        </div>
      )}
      
      {items.length > 0 && (
        <nav className={styles.nav}>
          {items.map((item, index) => (
            item.onClick ? (
              <div
                key={index}
                className={styles.navItem}
                onClick={item.onClick}
              >
                {item.icon && <span className={styles.icon}>{item.icon}</span>}
                <span className={styles.label}>{item.label}</span>
              </div>
            ) : (
              <NavLink
                key={index}
                to={item.to}
                className={({ isActive }) =>
                  classNames(styles.navItem, {
                    [styles.active]: isActive,
                  })
                }
                end={item.end}
              >
                {item.icon && <span className={styles.icon}>{item.icon}</span>}
                <span className={styles.label}>{item.label}</span>
              </NavLink>
            )
          ))}
        </nav>
      )}
      
      {footerItems.length > 0 && (
        <div className={styles.footer}>
          {footerItems.map((item, index) => (
            item.onClick ? (
              <div
                key={index}
                className={classNames(styles.navItem, styles.footerItem)}
                onClick={item.onClick}
              >
                {item.icon && <span className={styles.icon}>{item.icon}</span>}
                <span className={styles.label}>{item.label}</span>
              </div>
            ) : (
              <NavLink
                key={index}
                to={item.to}
                className={({ isActive }) =>
                  classNames(styles.navItem, styles.footerItem, {
                    [styles.active]: isActive,
                  })
                }
                end={item.end}
              >
                {item.icon && <span className={styles.icon}>{item.icon}</span>}
                <span className={styles.label}>{item.label}</span>
              </NavLink>
            )
          ))}
        </div>
      )}
    </aside>
  );
};

Sidebar.propTypes = {
  logo: PropTypes.node,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      to: PropTypes.string,
      label: PropTypes.string.isRequired,
      icon: PropTypes.node,
      end: PropTypes.bool,
      onClick: PropTypes.func,
    })
  ),
  footerItems: PropTypes.arrayOf(
    PropTypes.shape({
      to: PropTypes.string,
      label: PropTypes.string.isRequired,
      icon: PropTypes.node,
      end: PropTypes.bool,
      onClick: PropTypes.func,
    })
  ),
  className: PropTypes.string,
};

export default Sidebar; 