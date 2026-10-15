import React, { useState, useEffect, useCallback } from 'react';
import { formatDateTime } from '../../utils/dateUtils';
import adminService from '../../services/admin.service';
import EngagementSections from './analytics/EngagementSections';
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
        {formatDateTime(activity.timestamp)}
      </span>
      <span className={styles.activityText}>{getActivityText()}</span>
    </div>
  );
};

const PRESETS = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' }
];
const DEFAULT_PRESET_DAYS = 30;

// YYYY-MM-DD in the viewer's local calendar, as the date inputs use
const toInputDate = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// The last `days` calendar days, today included
const presetRange = (days) => {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1));
  return { startDate: toInputDate(start), endDate: toInputDate(end) };
};

const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [engagementError, setEngagementError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preset, setPreset] = useState(DEFAULT_PRESET_DAYS);
  const [dateRange, setDateRange] = useState(() => presetRange(DEFAULT_PRESET_DAYS));

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    const { startDate, endDate } = dateRange;
    const [overview, details] = await Promise.allSettled([
      adminService.getDashboardAnalytics(startDate, endDate),
      adminService.getEngagementAnalytics(startDate, endDate)
    ]);

    if (overview.status === 'fulfilled') {
      setAnalytics(overview.value);
      setError(null);
    } else {
      setError('Failed to load analytics data');
      console.error(overview.reason);
    }

    if (details.status === 'fulfilled') {
      setEngagement(details.value);
      setEngagementError(null);
    } else {
      const message = details.reason?.response?.data?.message;
      setEngagementError(message || 'Engagement metrics could not be loaded. Try refreshing.');
      console.error(details.reason);
    }
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handlePreset = (days) => {
    setPreset(days);
    setDateRange(presetRange(days));
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    // A cleared input would silently fall back to a different default period
    // on each endpoint, so keep the last complete range instead
    if (!value) return;
    setPreset(null);
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
    <div className={`${styles.dashboardContainer} ${loading ? styles.refreshing : ''}`} aria-busy={loading}>
      <div className={styles.dashboardHeader}>
        <h1>Analytics</h1>
        <div className={styles.dateRangeContainer}>
          <div className={styles.presets} role="group" aria-label="Date range">
            {PRESETS.map(({ days, label }) => (
              <button
                key={days}
                type="button"
                className={`${styles.presetButton} ${preset === days ? styles.presetActive : ''}`}
                aria-pressed={preset === days}
                onClick={() => handlePreset(days)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={styles.datePickerWrapper}>
            <input
              type="date"
              name="startDate"
              aria-label="Start date"
              value={dateRange.startDate}
              max={dateRange.endDate}
              onChange={handleDateChange}
              className={styles.datePicker}
            />
            <span className={styles.dateRangeSeparator}>-</span>
            <input
              type="date"
              name="endDate"
              aria-label="End date"
              value={dateRange.endDate}
              min={dateRange.startDate}
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
          <header className={styles.sectionHeader}>
            <h2>Overview</h2>
            <p>Totals are all-time; new, active and deleted counts cover the selected dates.</p>
          </header>

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
              <StatCard title="Average Patient Age" value={analytics.averagePatientAge || '-'} />
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

          {engagementError ? (
            <p className={styles.sectionError} role="alert">{engagementError}</p>
          ) : (
            engagement && <EngagementSections data={engagement} />
          )}

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