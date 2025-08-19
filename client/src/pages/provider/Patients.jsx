import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styles from './Patients.module.css';

// Component imports
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import SearchBox from '../../components/common/SearchBox';
import { toast } from 'react-toastify';
import PatientService from '../../services/patient.service';
import ConnectionService from '../../services/connection.service';

const ProviderPatients = () => {
  const [patients, setPatients] = useState([]);
  const [connections, setConnections] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [actionLoading, setActionLoading] = useState({ id: null, action: null });
  const navigate = useNavigate();
  const user = useSelector(state => state.auth.user);
  const verificationStatus = user?.isVerified;

  // Categories for patient access levels
  const categories = [
    { id: 'all', label: 'All Patients' },
    { id: 'recent', label: 'Recently Viewed' },
    { id: 'full-access', label: 'Full Access' },
    { id: 'limited-access', label: 'Limited Access' },
    { id: 'pending', label: 'Pending Approval' }
  ];

  useEffect(() => {
    fetchPatientsAndConnections();
  }, []);

  // Fetch all patients and their connection data
  const fetchPatientsAndConnections = async () => {
    try {
      setIsLoading(true);
      
      // Fetch both patients and connections
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
        // Fallback: derive patients from connections if patient list is empty
        patientsData = connectionsData
          .filter(conn => conn.patient)
          .map(conn => conn.patient);
      }
      
      // Merge patient data with connection data
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
          lastRecord: 'N/A', // This would need to be populated from consultations
          email: patient.email,
          accessLevel: connection ? connection.accessLevel : 'limited',
          fullAccessStatus: connection ? connection.fullAccessStatus : 'none',
          connectionId: connection ? connection._id : null,
          connection: connection
        };
      });
      
      setPatients(enhancedPatients);
      setConnections(connectionsData);
      setFilteredPatients(enhancedPatients);
      
    } catch (error) {
      console.error('Error fetching patients and connections:', error);
      toast.error('Failed to load patients');
      setPatients([]);
      setConnections([]);
      setFilteredPatients([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input change
  const handleSearch = (value) => {
    setSearchTerm(value);
    
    if (!value.trim()) {
      // If search is empty, filter based on current category
      filterByCategory(activeCategory, patients);
      return;
    }
    
    // Apply search on all patients first (simpler approach)
    const searchString = value.toLowerCase();
    const searchResults = patients.filter(patient => {
      // Convert all fields to strings and check if they contain the search term
      const searchableText = [
        patient.name || '',
        patient.email || '',
        String(patient.age || ''),
        patient.gender || '',
        patient.accessLevel || '',
        getAccessLevelDisplay(patient) || ''
      ].join(' ').toLowerCase();
      
      return searchableText.includes(searchString);
    });
    
    // Then apply category filter if not 'all'
    let finalResults = searchResults;
    if (activeCategory !== 'all') {
      switch (activeCategory) {
        case 'full-access':
          finalResults = searchResults.filter(patient => patient.accessLevel === 'full');
          break;
        case 'limited-access':
          finalResults = searchResults.filter(patient => patient.accessLevel === 'limited');
          break;
        case 'pending':
          finalResults = searchResults.filter(patient => patient.fullAccessStatus === 'pending');
          break;
        case 'recent':
          // For search within recent, we need to check if patient is in the first 3
          const recentPatientIds = patients.slice(0, 3).map(p => p.id);
          finalResults = searchResults.filter(patient => recentPatientIds.includes(patient.id));
          break;
      }
    }
    
    setFilteredPatients(finalResults);
  };

  // Filter patients by category
  const filterByCategory = (categoryId, patientsList = patients) => {
    setActiveCategory(categoryId);
    
    if (categoryId === 'all') {
      setFilteredPatients(patientsList);
      return;
    }
    
    let filtered;
    switch (categoryId) {
      case 'full-access':
        filtered = patientsList.filter(patient => patient.accessLevel === 'full');
        break;
      case 'limited-access':
        filtered = patientsList.filter(patient => patient.accessLevel === 'limited');
        break;
      case 'pending':
        filtered = patientsList.filter(patient => patient.fullAccessStatus === 'pending');
        break;
      case 'recent':
        // For demo, showing the first 3 patients as "recent"
        filtered = patientsList.slice(0, 3);
        break;
      default:
        filtered = patientsList;
    }
    
    setFilteredPatients(filtered);
  };

  // Navigate to add patient page
  const handleAddPatient = () => {
    navigate('/provider/patients/add');
  };

  // Navigate to create consultation for a patient
  const handleCreateConsultation = (patientId) => {
    navigate(`/provider/consultations/new?patientId=${patientId}`);
  };

  // Request full access for a patient
  const handleRequestFullAccess = async (patient) => {
    if (!patient.connectionId) {
      toast.error('No connection found for this patient');
      return;
    }

    setActionLoading({ id: patient.id, action: 'requestFullAccess' });
    
    try {
      await ConnectionService.requestFullAccess(patient.connectionId);
      toast.success('Full access request sent to patient');
      
      // Refresh data
      await fetchPatientsAndConnections();
    } catch (error) {
      console.error('Error requesting full access:', error);
      toast.error(error.response?.data?.message || 'Failed to request full access');
    } finally {
      setActionLoading({ id: null, action: null });
    }
  };

  // Get access level display text
  const getAccessLevelDisplay = (patient) => {
    if (patient.fullAccessStatus === 'pending') {
      return 'Full Access Pending';
    }
    return patient.accessLevel === 'full' ? 'Full Access' : 'Limited Access';
  };

  // Get access level badge class
  const getAccessLevelBadgeClass = (patient) => {
    if (patient.fullAccessStatus === 'pending') {
      return styles.pendingBadge;
    }
    return patient.accessLevel === 'full' ? styles.fullBadge : styles.limitedBadge;
  };

  // Check if provider can request full access
  const canRequestFullAccess = (patient) => {
    return patient.accessLevel === 'limited' && 
           patient.fullAccessStatus !== 'pending' && 
           patient.connectionId;
  };

  return (
    <div className={styles.patientsContainer}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>All Patients</h1>
          <p>Manage your patients and their consultations</p>
        </div>
        <div className={styles.actionSection}>
          <Button 
            variant="primary" 
            className={styles.addPatientBtn}
            onClick={handleAddPatient}
            disabled={!verificationStatus}
          >
            Add New Patient
          </Button>
        </div>
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
          <div className={styles.categoriesContainer}>
            {categories.map(category => (
              <button
                key={category.id}
                className={`${styles.categoryButton} ${activeCategory === category.id ? styles.active : ''}`}
                onClick={() => {
                  if (searchTerm) {
                    // If there's a search term, clear it and then apply category filter
                    setSearchTerm('');
                    filterByCategory(category.id);
                  } else {
                    // Otherwise directly apply category filter
                    filterByCategory(category.id);
                  }
                }}
              >
                {category.label}
              </button>
            ))}
          </div>
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
                      <Link 
                        to={`/provider/patients/${patient.id}`}
                        className={styles.viewDetailsButton}
                      >
                        Details
                      </Link>
                      <button 
                        className={styles.newConsultationButton}
                        onClick={() => handleCreateConsultation(patient.id)}
                      >
                        New Consultation
                      </button>
                      {canRequestFullAccess(patient) && (
                        <button 
                          className={styles.requestAccessButton}
                          onClick={() => handleRequestFullAccess(patient)}
                          disabled={actionLoading.id === patient.id}
                        >
                          {actionLoading.id === patient.id && actionLoading.action === 'requestFullAccess'
                            ? 'Requesting...'
                            : 'Request Full Access'}
                        </button>
                      )}
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

export default ProviderPatients; 