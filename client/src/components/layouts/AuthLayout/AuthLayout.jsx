import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import styles from './AuthLayout.module.css';
import heroImage from '../../../assets/images/hero-image.jpg';

/**
 * Layout for authentication pages
 */
const AuthLayout = () => {
  const location = useLocation();
  const pathname = location.pathname;
  
  // All auth pages should use the split layout with hero image
  const isAuthPage = pathname === '/admin/sign-in' || 
                    pathname === '/sign-in' || 
                    pathname === '/sign-up' ||
                    pathname === '/forgot-password';
  
  // Verification pages need full width layout
  const isVerificationPage = pathname === '/verify-your-email' || 
                            pathname.startsWith('/verify-email/') ||
                            pathname === '/verification-error';
  
  return (
    <div className={`${styles.authLayout} ${isAuthPage ? styles.adminAuthLayout : ''} ${isVerificationPage ? styles.verificationLayout : ''}`}>
      {isAuthPage ? (
        <div className={styles.adminLayoutContainer}>
          <div className={styles.adminContentSide}>
            <div className={styles.content}>
              <Outlet />
            </div>
          </div>
          <div className={styles.adminImageSide}>
            <img 
              src={heroImage} 
              alt="Onus Healthcare" 
              className={styles.heroImage}
            />
          </div>
        </div>
      ) : isVerificationPage ? (
        <div className={styles.verificationContainer}>
          <Outlet />
        </div>
      ) : (
        <div className={styles.container}>
          <div className={styles.logo}>
            <Link to="/">
              <div className={styles.logoText}>Onus Health</div>
            </Link>
          </div>
          <div className={styles.content}>
            <Outlet />
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthLayout; 