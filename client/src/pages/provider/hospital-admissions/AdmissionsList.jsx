import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import SearchBox from '../../../components/common/SearchBox';
import Table from '../../../components/common/Table';
import Pagination from '../../../components/common/Pagination';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import Badge from '../../../components/common/Badge/Badge';
import HospitalAdmissionService from '../../../services/hospitalAdmission.service';
import { formatDate } from '../../../utils/dateUtils';

import styles from './Admissions.module.css';

const PAGE_SIZE = 10;

const ProviderAdmissionsList = () => {
  const [admissions, setAdmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const data = await HospitalAdmissionService.listAdmissions();
        if (!cancelled) setAdmissions(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error('Failed to load hospital admissions');
        if (!cancelled) setAdmissions([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = admissions.map((a) => ({
    id: a._id,
    patientName: a.patient
      ? `${a.patient.firstName || ''} ${a.patient.lastName || ''}`.trim() || 'Unknown'
      : 'Unknown',
    hospitalName: a.hospitalName || '—',
    admissionDate: a.admissionDate,
    observationCount: a.observationCount ?? (a.observations ? a.observations.length : 0),
    status: a.status || 'admitted',
    reason: a.reasonForHospitalization || '',
  }));

  const filtered = rows.filter((r) => {
    const needle = searchTerm.toLowerCase().trim();
    if (!needle) return true;
    return (
      r.patientName.toLowerCase().includes(needle) ||
      r.hospitalName.toLowerCase().includes(needle) ||
      r.reason.toLowerCase().includes(needle) ||
      r.status.toLowerCase().includes(needle)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const statusBadge = (status) => {
    if (status === 'discharged') {
      return <Badge variant="completed">● Discharged</Badge>;
    }
    return <Badge variant="open">● Admitted</Badge>;
  };

  const columns = [
    { title: 'Patient', dataIndex: 'patientName' },
    { title: 'Hospital', dataIndex: 'hospitalName' },
    {
      title: 'Admitted',
      dataIndex: 'admissionDate',
      render: (_v, r) => (r.admissionDate ? formatDate(r.admissionDate) : '—'),
    },
    {
      title: 'Observations',
      dataIndex: 'observationCount',
      render: (_v, r) => (
        <span className={styles.countBadge}>{r.observationCount}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (_v, r) => statusBadge(r.status),
    },
    {
      title: 'Actions',
      dataIndex: 'actions',
      render: (_v, r) => (
        <Link to={`/provider/hospital-admissions/${r.id}`}>
          <Button variant="tertiary" size="small">
            View
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Hospital Admissions</h1>
          <p className={styles.subtitle}>View and manage patient hospital admissions</p>
        </div>
        <Link to="/provider/hospital-admissions/new">
          <Button>+ New Admission</Button>
        </Link>
      </div>

      <Card className={styles.tableCard}>
        <div className={styles.searchWrap}>
          <SearchBox
            placeholder="Search by patient name, hospital, reason, or status..."
            value={searchTerm}
            onChange={(v) => {
              setSearchTerm(v);
              setCurrentPage(1);
            }}
          />
        </div>

        {isLoading ? (
          <div className={styles.loading}>
            <LoadingSpinner />
            <p>Loading admissions...</p>
          </div>
        ) : pageRows.length === 0 ? (
          <div className={styles.empty}>No admissions found</div>
        ) : (
          <>
            <Table columns={columns} data={pageRows} />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default ProviderAdmissionsList;
