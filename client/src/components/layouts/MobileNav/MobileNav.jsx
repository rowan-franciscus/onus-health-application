import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import classNames from 'classnames';
import styles from './MobileNav.module.css';

/**
 * Mobile navigation component with burger menu
 */
const MobileNav = ({
  logo,
  items = [],
  footerItems = [],
  className = '',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Close menu when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      setIsOpen(false);
    };
    
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleNavClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Burger menu button */}
      <button 
        className={classNames(styles.burgerButton, className)} 
        onClick={toggleMenu}
        aria-label="Toggle navigation menu"
        {...props}
      >
        <span className={classNames(styles.burgerLine, { [styles.open]: isOpen })} />
        <span className={classNames(styles.burgerLine, { [styles.open]: isOpen })} />
        <span className={classNames(styles.burgerLine, { [styles.open]: isOpen })} />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className={styles.overlay} onClick={toggleMenu} />
      )}

      {/* Mobile navigation drawer */}
      <aside className={classNames(styles.mobileNav, { [styles.open]: isOpen })}>
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
                  onClick={(e) => {
                    item.onClick(e);
                    handleNavClick();
                  }}
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
                  onClick={handleNavClick}
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
                  onClick={(e) => {
                    item.onClick(e);
                    handleNavClick();
                  }}
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
                  onClick={handleNavClick}
                >
                  {item.icon && <span className={styles.icon}>{item.icon}</span>}
                  <span className={styles.label}>{item.label}</span>
                </NavLink>
              )
            ))}
          </div>
        )}
      </aside>
    </>
  );
};

MobileNav.propTypes = {
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

export default MobileNav;
