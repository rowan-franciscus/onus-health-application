import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBox from '../../components/common/SearchBox/SearchBox';
import Table from '../../components/common/Table/Table';
import Button from '../../components/common/Button/Button';
import LoadingIndicator from '../../components/common/LoadingIndicator/LoadingIndicator';
import { BiEdit } from 'react-icons/bi';
import { AiOutlineEye, AiOutlineDelete } from 'react-icons/ai';
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
      setPatients(response.data);
      setFilteredPatients(response.data);
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

  const handleEditPatient = (patientId) => {
    navigate(`/admin/patients/${patientId}/edit`);
  };

  const handleDeletePatient = async (patientId) => {
    if (window.confirm('Are you sure you want to delete this patient? This action cannot be undone.')) {
      try {
        await adminService.deleteUser(patientId);
        setPatients(prevPatients => 
          prevPatients.filter(patient => patient._id !== patientId)
        );
        setFilteredPatients(prevPatients => 
          prevPatients.filter(patient => patient._id !== patientId)
        );
      } catch (err) {
        setError('Failed to delete patient. Please try again.');
        console.error('Error deleting patient:', err);
      }
    }
  };

  const handleViewProfile = (patientId) => {
    navigate(`/admin/patients/${patientId}/profile`);
  };

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      cell: (row) => `${row.firstName || ''} ${row.lastName || ''}`,
      sortable: true,
    },
    {
      header: 'Patient ID',
      accessor: '_id',
      cell: (row) => row._id,
      sortable: true,
    },
    {
      header: 'Age',
      accessor: 'age',
      cell: (row) => {
        if (!row.dateOfBirth) return 'N/A';
        const dob = new Date(row.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        return age;
      },
      sortable: true,
    },
    {
      header: 'Last Record',
      accessor: 'lastUpdated',
      cell: (row) => {
        if (!row.lastUpdated) return 'Never';
        return new Date(row.lastUpdated).toLocaleDateString();
      },
      sortable: true,
    },
    {
      header: 'Phone Number',
      accessor: 'phone',
      cell: (row) => row.phone || 'N/A',
      sortable: true,
    },
    {
      header: 'Email Address',
      accessor: 'email',
      cell: (row) => row.email || 'N/A',
      sortable: true,
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <span className={`${styles.status} ${row.isActive ? styles.active : styles.inactive}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (row) => (
        <div className={styles.actions}>
          <Button 
            variant="icon" 
            onClick={() => handleViewPatient(row._id)}
            aria-label="View patient details"
          >
            <AiOutlineEye />
          </Button>
          <Button 
            variant="icon" 
            onClick={() => handleEditPatient(row._id)}
            aria-label="Edit patient"
          >
            <BiEdit />
          </Button>
          <Button 
            variant="icon" 
            onClick={() => handleDeletePatient(row._id)}
            aria-label="Delete patient"
          >
            <AiOutlineDelete />
          </Button>
          <Button 
            variant="tertiary" 
            onClick={() => handleViewProfile(row._id)}
          >
            View Profile
          </Button>
        </div>
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
            onChange={(e) => setSearchQuery(e.target.value)}
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