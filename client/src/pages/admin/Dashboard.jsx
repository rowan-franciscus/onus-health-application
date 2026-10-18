import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiRefreshCw } from 'react-icons/fi';
import adminService from '../../services/admin.service';
import {
  ActivationPanel,
  EngagementPanel,
  OverviewPanel,
  PlatformHealthPanel,
  RecordQualityPanel
} from './analytics/AnalyticsPanels';
import styles from './Dashboard.module.css';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'activation', label: 'Activation' },
  { id: 'record-quality', label: 'Record quality' },
  { id: 'platform-health', label: 'Platform health' }
];

const PRESETS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' }
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

const TabBar = ({ activeTab, onSelect }) => {
  const tabRefs = useRef({});

  // Arrow keys move between tabs (WAI-ARIA tabs pattern)
  const handleKeyDown = (event) => {
    const index = TABS.findIndex((t) => t.id === activeTab);
    const moves = { ArrowRight: 1, ArrowLeft: -1, Home: -index, End: TABS.length - 1 - index };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = TABS[(index + moves[event.key] + TABS.length) % TABS.length];
    onSelect(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <div className={styles.tabBar} role="tablist" aria-label="Analytics sections" onKeyDown={handleKeyDown}>
      {TABS.map((tab) => {
        const selected = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(el) => { tabRefs.current[tab.id] = el; }}
            id={`tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            className={`${styles.tab} ${selected ? styles.tabActive : ''}`}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = TABS.some((t) => t.id === requestedTab) ? requestedTab : TABS[0].id;

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
      setEngagementError(message || 'These metrics could not be loaded. Try refreshing.');
      console.error(details.reason);
    }
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleTabSelect = (tabId) => {
    setSearchParams(tabId === TABS[0].id ? {} : { tab: tabId }, { replace: true });
  };

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
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  if (loading && !analytics) {
    return <div className={styles.loadingContainer}>Loading dashboard data...</div>;
  }

  if (error) {
    return <div className={styles.errorContainer}>{error}</div>;
  }

  const renderPanel = () => {
    if (activeTab === 'overview') {
      return <OverviewPanel analytics={analytics} engagement={engagement} />;
    }
    if (engagementError) {
      return <p className={styles.sectionError} role="alert">{engagementError}</p>;
    }
    if (!engagement) return null;
    switch (activeTab) {
      case 'engagement':
        return <EngagementPanel data={engagement} />;
      case 'activation':
        return <ActivationPanel data={engagement} />;
      case 'record-quality':
        return <RecordQualityPanel data={engagement} />;
      case 'platform-health':
        return <PlatformHealthPanel data={engagement} />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <h1>Analytics</h1>
        <div className={styles.toolbar}>
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
            <span className={styles.dateRangeSeparator}>–</span>
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
          <button
            type="button"
            className={styles.refreshButton}
            onClick={fetchAnalytics}
            disabled={loading}
            aria-label="Refresh"
            title="Refresh"
          >
            <FiRefreshCw aria-hidden="true" className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      <TabBar activeTab={activeTab} onSelect={handleTabSelect} />

      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        aria-busy={loading}
        className={loading ? styles.refreshing : undefined}
      >
        {renderPanel()}
      </div>
    </div>
  );
};

export default Dashboard;
