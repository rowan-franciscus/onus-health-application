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
import SurgeryService from '../../../services/surgery.service';
import { formatDate } from '../../../utils/dateUtils';

import styles from './Surgeries.module.css';

const PAGE_SIZE = 10;

const ProviderSurgeriesList = () => {
  const [surgeries, setSurgeries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const data = await SurgeryService.listSurgeries();
        if (!cancelled) setSurgeries(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error('Failed to load surgery records');
        if (!cancelled) setSurgeries([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = surgeries.map((s) => ({
    id: s._id,
    patientName: s.patient
      ? `${s.patient.firstName || ''} ${s.patient.lastName || ''}`.trim() || 'Unknown'
      : 'Unknown',
    surgeryType: s.surgeryType || '—',
    date: s.date,
    leadSurgeon: s.leadSurgeon || '—',
    noteCount: s.noteCount ?? (s.notes ? s.notes.length : 0),
    status: s.status || 'open',
  }));

  const filtered = rows.filter((r) => {
    const needle = searchTerm.toLowerCase().trim();
    if (!needle) return true;
    return (
      r.patientName.toLowerCase().includes(needle) ||
      r.surgeryType.toLowerCase().includes(needle) ||
      r.leadSurgeon.toLowerCase().includes(needle) ||
      r.status.toLowerCase().includes(needle)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const statusBadge = (status) => {
    if (status === 'closed') {
      return <Badge variant="completed">● Closed</Badge>;
    }
    return <Badge variant="open">● Open</Badge>;
  };

  const columns = [
    { title: 'Patient', dataIndex: 'patientName' },
    { title: 'Surgery Type', dataIndex: 'surgeryType' },
    {
      title: 'Date',
      dataIndex: 'date',
      render: (_v, r) => (r.date ? formatDate(r.date) : '—'),
    },
    { title: 'Lead Surgeon', dataIndex: 'leadSurgeon' },
    {
      title: 'Notes',
      dataIndex: 'noteCount',
      render: (_v, r) => <span className={styles.countBadge}>{r.noteCount}</span>,
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
        <Link to={`/provider/surgeries/${r.id}`}>
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
          <h1 className={styles.title}>Surgery Records</h1>
          <p className={styles.subtitle}>Manage surgical records and operative notes</p>
        </div>
        <Link to="/provider/surgeries/new">
          <Button>+ New Surgery</Button>
        </Link>
      </div>

      <Card className={styles.tableCard}>
        <div className={styles.searchWrap}>
          <SearchBox
            placeholder="Search by patient, surgery type, surgeon..."
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
            <p>Loading surgery records...</p>
          </div>
        ) : pageRows.length === 0 ? (
          <div className={styles.empty}>No surgery records found</div>
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

export default ProviderSurgeriesList;
