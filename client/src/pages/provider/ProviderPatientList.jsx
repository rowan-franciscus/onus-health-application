import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

import Card from '../../components/common/Card';
import SearchBox from '../../components/common/SearchBox';
import PatientService from '../../services/patient.service';
import ConnectionService from '../../services/connection.service';

import styles from './Patients.module.css';

const DEFAULT_CATEGORIES = [
  { id: 'all', label: 'All Patients' },
  { id: 'recent', label: 'Recently Viewed' },
  { id: 'full-access', label: 'Full Access' },
  { id: 'limited-access', label: 'Limited Access' },
  { id: 'pending', label: 'Pending Approval' }
];

const getAccessLevelDisplay = (patient) => {
  if (patient.fullAccessStatus === 'pending') return 'Full Access Pending';
  return patient.accessLevel === 'full' ? 'Full Access' : 'Limited Access';
};

const getAccessLevelBadgeClass = (patient) => {
  if (patient.fullAccessStatus === 'pending') return styles.pendingBadge;
  return patient.accessLevel === 'full' ? styles.fullBadge : styles.limitedBadge;
};

/**
 * Shared patient table + search + category filters used by the Patients page and
 * the standalone record pages (Immunizations, Hospital Records, Surgeries).
 *
 * Props:
 *   - title, subtitle: header text
 *   - headerAction: optional node rendered in the header (e.g., "Add New Patient" button)
 *   - renderActions(patient): render-prop for the per-row action column
 *   - showCategories: show category filter buttons (default true)
 */
const ProviderPatientList = ({
  title = 'All Patients',
  subtitle = 'Manage your patients and their consultations',
  headerAction = null,
  renderActions,
  showCategories = true,
  categories = DEFAULT_CATEGORIES
}) => {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    fetchPatientsAndConnections();
  }, []);

  const fetchPatientsAndConnections = async () => {
    try {
      setIsLoading(true);

      const [patientsResponse, connectionsResponse] = await Promise.all([
        PatientService.getProviderPatients(),
        ConnectionService.getConnections()
      ]);

      let patientsData = [];
      let connectionsData = [];

      if (patientsResponse && patientsResponse.success && patientsResponse.patients) {
        patientsData = patientsResponse.patients;
      }

      if (Array.isArray(connectionsResponse)) {
        connectionsData = connectionsResponse;
      }

      if (patientsData.length === 0 && connectionsData.length > 0) {
        patientsData = connectionsData
          .filter(conn => conn.patient)
          .map(conn => conn.patient);
      }

      const enhancedPatients = patientsData.map(patient => {
        const connection = connectionsData.find(conn =>
          conn.patient && conn.patient._id === patient._id
        );

        return {
          id: patient._id,
          name: `${patient.firstName} ${patient.lastName}`,
          age: patient.patientProfile?.dateOfBirth ?
            new Date().getFullYear() - new Date(patient.patientProfile.dateOfBirth).getFullYear() : 'N/A',
          gender: patient.patientProfile?.gender || 'N/A',
          email: patient.email,
          accessLevel: connection ? connection.accessLevel : 'limited',
          fullAccessStatus: connection ? connection.fullAccessStatus : 'none',
          connectionId: connection ? connection._id : null,
          connection
        };
      });

      setPatients(enhancedPatients);
      setFilteredPatients(enhancedPatients);
    } catch (error) {
      console.error('Error fetching patients and connections:', error);
      toast.error('Failed to load patients');
      setPatients([]);
      setFilteredPatients([]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyCategoryFilter = (list, categoryId) => {
    switch (categoryId) {
      case 'full-access':
        return list.filter(p => p.accessLevel === 'full');
      case 'limited-access':
        return list.filter(p => p.accessLevel === 'limited');
      case 'pending':
        return list.filter(p => p.fullAccessStatus === 'pending');
      case 'recent':
        return list.slice(0, 3);
      case 'all':
      default:
        return list;
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);

    if (!value.trim()) {
      setFilteredPatients(applyCategoryFilter(patients, activeCategory));
      return;
    }

    const searchString = value.toLowerCase();
    const searchResults = patients.filter(patient => {
      const searchable = [
        patient.name || '',
        patient.email || '',
        String(patient.age || ''),
        patient.gender || '',
        patient.accessLevel || '',
        getAccessLevelDisplay(patient)
      ].join(' ').toLowerCase();
      return searchable.includes(searchString);
    });

    setFilteredPatients(applyCategoryFilter(searchResults, activeCategory));
  };

  const filterByCategory = (categoryId) => {
    setActiveCategory(categoryId);
    setFilteredPatients(applyCategoryFilter(patients, categoryId));
  };

  return (
    <div className={styles.patientsContainer}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {headerAction && (
          <div className={styles.actionSection}>
            {headerAction}
          </div>
        )}
      </div>

      <Card className={styles.patientsCard}>
        <div className={styles.filterSection}>
          <div className={styles.searchContainer}>
            <SearchBox
              placeholder="Search patients by name, age, access level, email..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          {showCategories && (
            <div className={styles.categoriesContainer}>
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`${styles.categoryButton} ${activeCategory === category.id ? styles.active : ''}`}
                  onClick={() => {
                    if (searchTerm) setSearchTerm('');
                    filterByCategory(category.id);
                  }}
                >
                  {category.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className={styles.loading}>Loading patients...</div>
        ) : filteredPatients.length > 0 ? (
          <div className={styles.patientsTable}>
            <div className={styles.tableHeader}>
              <div className={styles.colName}>Name</div>
              <div className={styles.colId}>ID</div>
              <div className={styles.colAge}>Age</div>
              <div className={styles.colAccess}>Access Level</div>
              <div className={styles.colEmail}>Email</div>
              <div className={styles.colActions}>Actions</div>
            </div>
            <div className={styles.tableBody}>
              {filteredPatients.map(patient => (
                <div key={patient.id} className={styles.tableRow}>
                  <div className={styles.colName}>
                    <div className={styles.patientNameContainer}>
                      <span className={styles.patientName}>{patient.name}</span>
                    </div>
                  </div>
                  <div className={styles.colId}>{patient.id}</div>
                  <div className={styles.colAge}>{patient.age}</div>
                  <div className={styles.colAccess}>
                    <span className={getAccessLevelBadgeClass(patient)}>
                      {getAccessLevelDisplay(patient)}
                    </span>
                  </div>
                  <div className={styles.colEmail}>{patient.email}</div>
                  <div className={styles.colActions}>
                    <div className={styles.actionButtons}>
                      {renderActions ? renderActions(patient, { refresh: fetchPatientsAndConnections }) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.noResults}>
            {searchTerm ?
              `No patients found matching "${searchTerm}"` :
              'No patients found in this category'
            }
          </div>
        )}
      </Card>
    </div>
  );
};

export default ProviderPatientList;
