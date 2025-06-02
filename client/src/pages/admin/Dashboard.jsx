import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import adminService from '../../services/admin.service';
import styles from './Dashboard.module.css';

const StatCard = ({ title, value }) => (
  <div className={styles.statCard}>
    <h3>{value}</h3>
    <p>{title}</p>
  </div>
);

const ActivityItem = ({ activity }) => {
  const getActivityText = () => {
    switch (activity.type) {
      case 'user_created':
        return `New ${activity.role} registered: ${activity.user}`;
      case 'consultation_created':
        return `New consultation created by ${activity.provider} for ${activity.patient}`;
      default:
        return 'Unknown activity';
    }
  };

  return (
    <div className={styles.activityItem}>
      <span className={styles.activityTime}>
        {format(new Date(activity.timestamp), 'MMM dd, yyyy - HH:mm')}
      </span>
      <span className={styles.activityText}>{getActivityText()}</span>
    </div>
  );
};

const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboardAnalytics(
        dateRange.startDate || null,
        dateRange.endDate || null
      );
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debug authentication token
    const token = localStorage.getItem('onus_auth_token');
    console.log('Dashboard - Auth token in localStorage:', token ? 'Token exists' : 'No token found');
    if (token) {
      console.log('Auth token value:', token.substring(0, 20) + '...');
      console.log('Auth header that will be sent:', `Bearer ${token.substring(0, 20)}...`);
    }
    
    fetchAnalytics();
  }, [dateRange.startDate, dateRange.endDate]);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRefresh = () => {
    fetchAnalytics();
  };

  if (loading && !analytics) {
    return <div className={styles.loadingContainer}>Loading dashboard data...</div>;
  }

  if (error) {
    return <div className={styles.errorContainer}>{error}</div>;
  }

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <h1>Analytics</h1>
        <div className={styles.dateRangeContainer}>
          <div className={styles.datePickerWrapper}>
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className={styles.datePicker}
            />
            <span className={styles.dateRangeSeparator}>-</span>
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className={styles.datePicker}
            />
          </div>
          <button className={styles.refreshButton} onClick={handleRefresh}>
            Refresh
          </button>
        </div>
      </div>

      {analytics && (
        <>
          {/* General Analytics */}
          <section className={styles.statsSection}>
            <div className={styles.statsGrid}>
              <StatCard title="Total Users" value={analytics.totalUsers} />
              <StatCard title="Total Patients" value={analytics.totalPatients} />
              <StatCard title="Total Health Providers" value={analytics.totalProviders} />
              <StatCard title="Total Consultations" value={analytics.totalConsultations} />
            </div>
          </section>

          {/* Demographics */}
          <section className={styles.statsSection}>
            <div className={styles.statsGrid}>
              <StatCard 
                title="Patient Gender Distribution" 
                value={`${analytics.genderDistribution.male || 0} Male / ${analytics.genderDistribution.female || 0} Female`} 
              />
              <StatCard title="Average Patient Age" value={analytics.averagePatientAge || 'N/A'} />
            </div>
          </section>

          {/* Activity Metrics */}
          <section className={styles.statsSection}>
            <div className={styles.statsGrid}>
              <StatCard title="New Users" value={analytics.newUsers || 0} />
              <StatCard title="New Patients" value={analytics.newPatients || 0} />
              <StatCard title="New Health Providers" value={analytics.newProviders || 0} />
              <StatCard title="Active Users" value={analytics.activeUsers || 0} />
            </div>
          </section>

          <section className={styles.statsSection}>
            <div className={styles.statsGrid}>
              <StatCard title="Active Patients" value={analytics.activePatients || 0} />
              <StatCard title="Active Health Providers" value={analytics.activeProviders || 0} />
              <StatCard title="New Consultations" value={analytics.newConsultations || 0} />
              <StatCard title="Deleted profiles" value={analytics.deletedProfiles || 0} />
            </div>
          </section>

          {/* Activity Log */}
          <section className={styles.activityLogSection}>
            <h2>Recent Activity</h2>
            <div className={styles.activityLog}>
              {analytics.activityLog && analytics.activityLog.length > 0 ? (
                analytics.activityLog.map((activity, index) => (
                  <ActivityItem key={index} activity={activity} />
                ))
              ) : (
                <p className={styles.noActivities}>No recent activities</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard; 