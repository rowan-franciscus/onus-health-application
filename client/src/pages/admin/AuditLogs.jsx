import React, { useState, useEffect, useCallback } from 'react';
import Table from '../../components/common/Table/Table';
import Button from '../../components/common/Button/Button';
import LoadingIndicator from '../../components/common/LoadingIndicator/LoadingIndicator';
import auditService from '../../services/audit.service';
import styles from './AuditLogs.module.css';

const TYPE_OPTIONS = ['auth', 'data', 'consent', 'admin', 'export', 'security', 'audit'];
const ACTION_OPTIONS = ['C', 'R', 'U', 'D', 'E'];
const ACTION_LABELS = { C: 'Create', R: 'Read', U: 'Update', D: 'Delete', E: 'Execute' };

const EMPTY_FILTERS = {
  patientId: '',
  actorId: '',
  startDate: '',
  endDate: '',
  type: '',
  action: ''
};

const formatActor = (event) => {
  const actor = event.agent?.userId;
  if (actor && (actor.firstName || actor.email)) {
    return `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email;
  }
  return event.agent?.role === 'system' ? 'System' : 'Unknown';
};

const formatPatient = (event) => {
  const patient = event.entity?.patientId;
  if (patient && (patient.firstName || patient.email)) {
    return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.email;
  }
  return patient ? String(patient) : '-';
};

const AuditLogs = () => {
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await auditService.getAuditLogs({ ...appliedFilters, page, limit: 50 });
      setEvents(response.events || []);
      setPagination(response.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError('Failed to load audit logs. Please try again.');
      console.error('Error fetching audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleFilterChange = (field) => (e) => {
    setFilters((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const columns = [
    {
      header: 'Recorded (UTC)',
      accessor: 'recorded',
      render: (value, row) => new Date(row.recorded).toISOString().replace('T', ' ').slice(0, 19),
      sortable: true,
    },
    {
      header: 'Actor',
      accessor: 'actor',
      render: (value, row) => `${formatActor(row)} (${row.agent?.role || '-'})`,
    },
    {
      header: 'Event',
      accessor: 'subtype',
      render: (value, row) => `${row.type} / ${row.subtype}`,
      sortable: true,
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (value, row) => ACTION_LABELS[row.action] || row.action,
    },
    {
      header: 'Resource',
      accessor: 'resource',
      render: (value, row) =>
        row.entity?.resourceType
          ? `${row.entity.resourceType}${row.entity.resourceId ? ` (${String(row.entity.resourceId).slice(-6)})` : ''}`
          : '-',
    },
    {
      header: 'Patient',
      accessor: 'patient',
      render: (value, row) => formatPatient(row),
    },
    {
      header: 'Outcome',
      accessor: 'outcome',
      render: (value, row) => (
        <span className={row.outcome === '0' ? styles.success : styles.failure}>
          {row.outcome === '0' ? 'Success' : `Failure${row.outcomeDesc ? `: ${row.outcomeDesc}` : ''}`}
        </span>
      ),
    },
    {
      header: 'IP',
      accessor: 'ip',
      render: (value, row) => row.agent?.ip || '-',
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Audit Trail</h1>
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Patient ID"
          value={filters.patientId}
          onChange={handleFilterChange('patientId')}
          className={styles.filterInput}
        />
        <input
          type="text"
          placeholder="Actor ID"
          value={filters.actorId}
          onChange={handleFilterChange('actorId')}
          className={styles.filterInput}
        />
        <input
          type="date"
          value={filters.startDate}
          onChange={handleFilterChange('startDate')}
          className={styles.filterInput}
          aria-label="Start date"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={handleFilterChange('endDate')}
          className={styles.filterInput}
          aria-label="End date"
        />
        <select value={filters.type} onChange={handleFilterChange('type')} className={styles.filterInput}>
          <option value="">All types</option>
          {TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select value={filters.action} onChange={handleFilterChange('action')} className={styles.filterInput}>
          <option value="">All actions</option>
          {ACTION_OPTIONS.map((action) => (
            <option key={action} value={action}>{ACTION_LABELS[action]}</option>
          ))}
        </select>
        <Button variant="primary" size="small" onClick={applyFilters}>Apply</Button>
        <Button variant="secondary" size="small" onClick={resetFilters}>Reset</Button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {isLoading ? (
        <LoadingIndicator />
      ) : (
        <>
          <div className={styles.tableContainer}>
            <Table
              columns={columns}
              data={events}
              emptyMessage="No audit events found"
            />
          </div>
          <div className={styles.pagination}>
            <Button
              variant="secondary"
              size="small"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              Previous
            </Button>
            <span className={styles.pageInfo}>
              Page {pagination.page} of {Math.max(pagination.totalPages, 1)} ({pagination.total} events)
            </span>
            <Button
              variant="secondary"
              size="small"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default AuditLogs;
