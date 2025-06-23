import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBox from '../../components/common/SearchBox/SearchBox';
import Table from '../../components/common/Table/Table';
import Button from '../../components/common/Button/Button';
import LoadingIndicator from '../../components/common/LoadingIndicator/LoadingIndicator';
import { AiOutlineEye } from 'react-icons/ai';
import adminService from '../../services/admin.service';
import styles from './Patients.module.css';

const Patients = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPatients = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminService.getUsers({ role: 'patient' });
      setPatients(response.users || []);
      setFilteredPatients(response.users || []);
    } catch (err) {
      setError('Failed to load patients. Please try again.');
      console.error('Error fetching patients:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Handle search input change
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPatients(patients);
    } else {
      const lowercasedQuery = searchQuery.toLowerCase();
      const filtered = patients.filter(
        patient =>
          patient.firstName?.toLowerCase().includes(lowercasedQuery) ||
          patient.lastName?.toLowerCase().includes(lowercasedQuery) ||
          patient.email?.toLowerCase().includes(lowercasedQuery) ||
          patient._id?.toLowerCase().includes(lowercasedQuery)
      );
      setFilteredPatients(filtered);
    }
  }, [searchQuery, patients]);

  const handleViewPatient = (patientId) => {
    navigate(`/admin/patients/${patientId}`);
  };

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      render: (value, row) => `${row.firstName || ''} ${row.lastName || ''}`.trim(),
      sortable: true,
    },
    {
      header: 'Patient ID',
      accessor: '_id',
      render: (value, row) => row._id,
      sortable: true,
    },
    {
      header: 'Age',
      accessor: 'age',
      render: (value, row) => {
        const dob = row.patientProfile?.dateOfBirth;
        if (!dob) return '-';
        const dobDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - dobDate.getFullYear();
        const monthDiff = today.getMonth() - dobDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
          age--;
        }
        return age;
      },
      sortable: true,
    },
    {
      header: 'Date of Last Record',
      accessor: 'lastRecord',
      render: (value, row) => {
        // Use the most recent date between updatedAt and createdAt
        const lastUpdate = row.updatedAt || row.createdAt;
        if (!lastUpdate) return 'Never';
        return new Date(lastUpdate).toLocaleDateString();
      },
      sortable: true,
    },
    {
      header: 'Phone Number',
      accessor: 'phone',
      render: (value, row) => row.phone || row.patientProfile?.phone || '-',
      sortable: true,
    },
    {
      header: 'Email Address',
      accessor: 'email',
      render: (value, row) => row.email || '-',
      sortable: true,
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (value, row) => (
        <Button 
          variant="secondary"
          size="small"
          onClick={() => handleViewPatient(row._id)}
          aria-label="View patient details"
        >
          <AiOutlineEye style={{ marginRight: '4px' }} />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>All Patients</h1>
        <div className={styles.searchContainer}>
          <SearchBox
            placeholder="Search patients..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      
      {isLoading ? (
        <LoadingIndicator />
      ) : (
        <div className={styles.tableContainer}>
          <Table
            columns={columns}
            data={filteredPatients || []}
            emptyMessage="No patients found"
          />
        </div>
      )}
    </div>
  );
};

export default Patients; 