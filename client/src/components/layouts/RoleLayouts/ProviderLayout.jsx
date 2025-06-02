import React from 'react';
import { Outlet } from 'react-router-dom';
import DashboardLayout from '../DashboardLayout/DashboardLayout';

/**
 * Provider-specific layout component
 * Uses the base DashboardLayout with role='provider'
 */
const ProviderLayout = () => {
  return (
    <DashboardLayout role="provider">
      <Outlet />
    </DashboardLayout>
  );
};

export default ProviderLayout; 