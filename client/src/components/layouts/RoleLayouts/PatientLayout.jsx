import React from 'react';
import { Outlet } from 'react-router-dom';
import DashboardLayout from '../DashboardLayout/DashboardLayout';

/**
 * Patient-specific layout component
 * Uses the base DashboardLayout with role='patient'
 */
const PatientLayout = () => {
  return (
    <DashboardLayout role="patient">
      <Outlet />
    </DashboardLayout>
  );
};

export default PatientLayout; 