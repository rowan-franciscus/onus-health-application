import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import SearchBox from '../../../components/common/SearchBox';
import Table from '../../../components/common/Table';
import Pagination from '../../../components/common/Pagination';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import PatientService from '../../../services/patient.service';

import styles from './Biometrics.module.css';

const PAGE_SIZE = 10;

const calculateAge = (dob) => {
  if (!dob) return '—';
  try {
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age -= 1;
    }
    return Number.isFinite(age) && age >= 0 ? age : '—';
  } catch {
    return '—';
  }
};

const ProviderBiometricsList = () => {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const data = await PatientService.getProviderPatients();
        const list = Array.isArray(data) ? data : data?.patients || [];
        if (!cancelled) setPatients(list);
      } catch (err) {
        toast.error('Failed to load patients');
        if (!cancelled) setPatients([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = patients.map((p) => {
    const patientId = p._id || p.id;
    const dob = p.patientProfile?.dateOfBirth || p.dateOfBirth;
    return {
      id: patientId,
      name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown',
      shortId: patientId ? `${String(patientId).slice(0, 8)}...` : '—',
      age: calculateAge(dob),
      email: p.email || '—',
    };
  });

  const filtered = rows.filter((r) => {
    const needle = searchTerm.toLowerCase().trim();
    if (!needle) return true;
    return r.name.toLowerCase().includes(needle);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const columns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'ID', dataIndex: 'shortId' },
    { title: 'Age', dataIndex: 'age' },
    { title: 'Email', dataIndex: 'email' },
    {
      title: 'Actions',
      dataIndex: 'actions',
      render: (_v, r) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={`/provider/biometrics/${r.id}`}>
            <Button variant="tertiary" size="small">
              View
            </Button>
          </Link>
          <Link to={`/provider/biometrics/${r.id}`}>
            <Button size="small">Add Biometrics</Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Biometrics</h1>
          <p className={styles.subtitle}>Select a patient to record biometric measurements</p>
        </div>
      </div>

      <Card className={styles.tableCard}>
        <div className={styles.searchWrap}>
          <SearchBox
            placeholder="Search by patient name..."
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
            <p>Loading patients...</p>
          </div>
        ) : pageRows.length === 0 ? (
          <div className={styles.empty}>No patients found</div>
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

export default ProviderBiometricsList;
