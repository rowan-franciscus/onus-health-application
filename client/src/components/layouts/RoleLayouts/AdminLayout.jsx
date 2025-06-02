import React from 'react';
import { Outlet } from 'react-router-dom';
import DashboardLayout from '../DashboardLayout/DashboardLayout';

/**
 * Admin-specific layout component
 * Uses the base DashboardLayout with role='admin'
 */
const AdminLayout = () => {
  return (
    <DashboardLayout role="admin">
      <Outlet />
    </DashboardLayout>
  );
};

export default AdminLayout; 