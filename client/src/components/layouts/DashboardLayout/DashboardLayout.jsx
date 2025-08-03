import React from 'react';
import PropTypes from 'prop-types';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import Sidebar from '../Sidebar';
import Header from '../Header';
import styles from './DashboardLayout.module.css';
import FileService from '../../../services/file.service';

// Import logo
import logoWhite from '../../../assets/logos/logo-white.png';

// Import icons
import analyticsIcon from '../../../assets/icons/analytics-icon.svg';
import healthCareProvidersIcon from '../../../assets/icons/health-care-providers-icon.svg';
import patientsIcon from '../../../assets/icons/patients-icon.svg';
import settingsIcon from '../../../assets/icons/settings-icon.svg';
import consultationsIcon from '../../../assets/icons/consultations-icon.svg';
import medicalRecordsIcon from '../../../assets/icons/medical-records-icon.svg';
import connectionsIcon from '../../../assets/icons/connections-icon.svg';
import profileIcon from '../../../assets/icons/profile-icon.svg';
import signOutIcon from '../../../assets/icons/sign-out-icon.svg';
import helpIcon from '../../../assets/icons/help-icon.svg';

// Navigation items for different roles
const getNavItems = (role, logoutFn) => {
  const baseItems = {
    admin: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: <img src={analyticsIcon} alt="Dashboard" /> },
      { to: '/admin/health-providers', label: 'Health Care Providers', icon: <img src={healthCareProvidersIcon} alt="Health Providers" /> },
      { to: '/admin/patients', label: 'Patients', icon: <img src={patientsIcon} alt="Patients" /> },
      { to: '/admin/settings', label: 'Settings', icon: <img src={settingsIcon} alt="Settings" /> },
    ],
    provider: [
      { to: '/provider/dashboard', label: 'Dashboard', icon: <img src={analyticsIcon} alt="Dashboard" /> },
      { to: '/provider/patients', label: 'Patients', icon: <img src={patientsIcon} alt="Patients" /> },
      { to: '/provider/consultations', label: 'Consultations', icon: <img src={consultationsIcon} alt="Consultations" /> },
      { to: '/provider/medical-records', label: 'Medical Records', icon: <img src={medicalRecordsIcon} alt="Medical Records" /> },
      { to: '/provider/profile', label: 'Profile', icon: <img src={profileIcon} alt="Profile" /> },
      { to: '/provider/settings', label: 'Settings', icon: <img src={settingsIcon} alt="Settings" /> },
    ],
    patient: [
      { to: '/patient/dashboard', label: 'Dashboard', icon: <img src={analyticsIcon} alt="Dashboard" /> },
      { to: '/patient/consultations', label: 'Consultations', icon: <img src={consultationsIcon} alt="Consultations" /> },
      { to: '/patient/medical-records', label: 'Medical Records', icon: <img src={medicalRecordsIcon} alt="Medical Records" /> },
      { to: '/patient/connections', label: 'Connections', icon: <img src={connectionsIcon} alt="Connections" /> },
      { to: '/patient/profile', label: 'Profile', icon: <img src={profileIcon} alt="Profile" /> },
      { to: '/patient/settings', label: 'Settings', icon: <img src={settingsIcon} alt="Settings" /> },
    ]
  };

  const footerItems = [
    { label: 'Sign Out', icon: <img src={signOutIcon} alt="Sign Out" />, onClick: logoutFn },
    { to: `/${role}/help`, label: 'Help', icon: <img src={helpIcon} alt="Help" /> },
  ];

  return {
    items: baseItems[role] || [],
    footerItems
  };
};

/**
 * Layout for authenticated dashboard pages with role-specific navigation
 */
const DashboardLayout = ({ role }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { items, footerItems } = getNavItems(role, logout);
  
  // Create the logo component
  const logo = (
    <div className={styles.logoContainer}>
      <img src={logoWhite} alt="Onus Logo" className={styles.logoImage} />
    </div>
  );

  // Determine current page title based on location
  const getCurrentPageTitle = () => {
    // Find the current nav item based on the path
    const currentItem = items.find((item) => 
      location.pathname.startsWith(item.to)
    );
    
    return currentItem ? currentItem.label : '';
  };

  // Get user information based on role
  const getUserDisplay = () => {
    const profileUrlMap = {
      admin: '/admin/profile',
      provider: '/provider/profile',
      patient: '/patient/profile'
    };

    // Try to get name from user profile data
    let fullName = '';
    let firstName = '';
    let lastName = '';
    
    // Check for personalInfo in user profile (Patient)
    if (user?.profile?.personalInfo) {
      firstName = user.profile.personalInfo.firstName || '';
      lastName = user.profile.personalInfo.lastName || '';
      if (firstName && lastName) {
        fullName = `${firstName} ${lastName}`;
      }
    } 
    // Check for professionalInfo in user profile (Provider)
    else if (user?.profile?.professionalInfo) {
      firstName = user.profile.professionalInfo.firstName || '';
      lastName = user.profile.professionalInfo.lastName || '';
      if (firstName && lastName) {
        fullName = `${firstName} ${lastName}`;
      }
    }
    // Fallback to firstName/lastName directly on user object
    else if (user?.firstName && user?.lastName) {
      firstName = user.firstName;
      lastName = user.lastName;
      fullName = `${firstName} ${lastName}`;
    }
    // Last resort: use name property if available
    else if (user?.name) {
      fullName = user.name;
      // Try to parse first and last name from full name
      const nameParts = user.name.trim().split(' ');
      if (nameParts.length >= 2) {
        firstName = nameParts[0];
        lastName = nameParts[nameParts.length - 1];
      } else {
        firstName = nameParts[0] || '';
        lastName = '';
      }
    }
    
    // Add Dr. prefix for providers if we have a name
    let prefix = (role === 'provider' && fullName) ? 'Dr. ' : '';
    
    // Use an empty string if no name is available
    const displayName = fullName ? prefix + fullName : '';
    
    return {
      name: displayName,
      firstName: firstName,
      lastName: lastName,
      profileUrl: profileUrlMap[role] || '#',
      avatarUrl: user?.profileImage ? FileService.getProfilePictureUrl(user.profileImage, user?._id || user?.id) : null
    };
  };

  return (
    <div className={styles.dashboardLayout}>
      <Sidebar 
        logo={logo}
        items={items}
        footerItems={footerItems}
        className={styles.sidebar}
      />
      <div className={styles.mainContent}>
        <Header 
          title={getCurrentPageTitle()}
          user={getUserDisplay()}
          className={styles.header}
        />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

DashboardLayout.propTypes = {
  role: PropTypes.oneOf(['patient', 'provider', 'admin']).isRequired,
};

export default DashboardLayout; 