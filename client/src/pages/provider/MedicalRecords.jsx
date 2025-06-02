import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './MedicalRecords.module.css';

// Component imports
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import SearchBox from '../../components/common/SearchBox';
import Tabs from '../../components/common/Tabs';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';

// Import icons
import vitalsIcon from '../../assets/icons/vitals-icon-large.svg';
import medicationsIcon from '../../assets/icons/medications-icon-large.svg';
import immunizationsIcon from '../../assets/icons/immunizations-icon-large.svg';
import labResultsIcon from '../../assets/icons/lab-results-icon-large.svg';
import radiologyIcon from '../../assets/icons/radiology-reports-icon-large.svg';
import hospitalIcon from '../../assets/icons/hospital-icon-large.svg';
import surgeryIcon from '../../assets/icons/surgery-icon-large.svg';

// Record types
const RECORD_TYPES = [
  { id: 'vitals', label: 'Vitals', icon: vitalsIcon },
  { id: 'medications', label: 'Medications', icon: medicationsIcon },
  { id: 'immunizations', label: 'Immunizations', icon: immunizationsIcon },
  { id: 'lab-results', label: 'Lab Results', icon: labResultsIcon },
  { id: 'radiology', label: 'Radiology', icon: radiologyIcon },
  { id: 'hospital', label: 'Hospital', icon: hospitalIcon },
  { id: 'surgery', label: 'Surgery', icon: surgeryIcon }
];

const MedicalRecords = () => {
  const { type } = useParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(type || 'vitals');
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  // Check if we're on the main medical records page or a specific type
  const isMainPage = location.pathname === '/provider/medical-records';

  useEffect(() => {
    // If we're on a specific type page, fetch the records
    if (!isMainPage) {
      // Fetch records based on active tab
      fetchRecords(activeTab);
    } else {
      // On main page, no need to load records
      setIsLoading(false);
    }
  }, [activeTab, currentPage, isMainPage]);

  const fetchRecords = async (recordType) => {
    setIsLoading(true);
    try {
      // Use the real medical records service to fetch records
      const response = await fetch(`/api/medical-records/provider/${recordType}?limit=10&page=${currentPage}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.records) {
          // Transform the data to match our component's expected format
          const formattedRecords = data.records.map(record => ({
            id: record._id,
            patientName: record.patient ? 
              `${record.patient.firstName} ${record.patient.lastName}` : 'Unknown Patient',
            date: record.date || record.createdAt,
            // Add type-specific properties based on recordType
            ...(recordType === 'vitals' && {
              heartRate: record.heartRate?.value,
              bloodPressure: record.bloodPressure ? 
                `${record.bloodPressure.systolic}/${record.bloodPressure.diastolic}` : 'N/A',
              temperature: record.bodyTemperature?.value
            }),
            ...(recordType === 'medications' && {
              medication: record.name,
              dosage: record.dosage,
              frequency: record.frequency
            }),
            ...(recordType === 'immunizations' && {
              vaccine: record.vaccineName,
              serialNumber: record.vaccineSerialNumber,
              nextDueDate: record.nextDueDate
            })
          }));
          
          setRecords(formattedRecords);
          setTotalPages(data.pagination?.pages || 1);
        } else {
          console.log(`No ${recordType} records found`);
          setRecords([]);
          setTotalPages(1);
        }
      } else {
        console.error(`Failed to fetch ${recordType} records:`, response.statusText);
        setRecords([]);
        setTotalPages(1);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error(`Error fetching ${recordType} records:`, error);
      toast.error(`Failed to fetch ${recordType} records`);
      setRecords([]);
      setTotalPages(1);
      setIsLoading(false);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
    setSearchTerm('');
    // Update URL when tab changes
    navigate(`/provider/medical-records/${tabId}`);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleViewPatient = (patientId) => {
    navigate(`/provider/patients/${patientId}`);
  };

  // Filter records based on search term
  const filteredRecords = records.filter(record => 
    record.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Table columns based on active tab
  const getColumns = () => {
    const commonColumns = [
      {
        header: 'Patient',
        accessor: 'patientName',
        sortable: true
      },
      {
        header: 'Date',
        accessor: 'date',
        sortable: true,
        render: (item) => new Date(item.date).toLocaleDateString()
      }
    ];

    const actionColumn = {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      render: (item) => (
        <div className={styles.actionButtons}>
          <Button 
            variant="tertiary" 
            size="small" 
            onClick={() => handleViewPatient(item.id.split('-')[1])}
          >
            View Patient
          </Button>
        </div>
      )
    };

    // Add type-specific columns based on activeTab
    let specificColumns = [];
    
    switch (activeTab) {
      case 'vitals':
        specificColumns = [
          { header: 'Heart Rate', accessor: 'heartRate', sortable: true },
          { header: 'Blood Pressure', accessor: 'bloodPressure', sortable: true },
          { header: 'Temperature (°C)', accessor: 'temperature', sortable: true }
        ];
        break;
      case 'medications':
        specificColumns = [
          { header: 'Medication', accessor: 'medication', sortable: true },
          { header: 'Dosage', accessor: 'dosage', sortable: true },
          { header: 'Frequency', accessor: 'frequency', sortable: true }
        ];
        break;
      case 'immunizations':
        specificColumns = [
          { header: 'Vaccine', accessor: 'vaccine', sortable: true },
          { header: 'Serial Number', accessor: 'serialNumber', sortable: true },
          { header: 'Next Due Date', accessor: 'nextDueDate', sortable: true,
            render: (item) => item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString() : 'N/A' }
        ];
        break;
      default:
        specificColumns = [
          { header: 'Details', accessor: 'details', sortable: false }
        ];
    }

    return [...commonColumns, ...specificColumns, actionColumn];
  };

  // Render medical record categories view (main page)
  const renderCategoriesView = () => {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Medical Records</h1>
          <p>View patient medical records by category</p>
        </div>
        
        <div className={styles.recordsGrid}>
          {RECORD_TYPES.map(type => (
            <Link 
              key={type.id} 
              to={`/provider/medical-records/${type.id}`} 
              className={styles.recordCard}
              aria-label={`View ${type.label} records`}
            >
              <div className={styles.iconContainer}>
                <img src={type.icon} alt={`${type.label} icon`} className={styles.icon} />
              </div>
              <h2 className={styles.recordName}>{type.label}</h2>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  // Render medical records tab view (type-specific page)
  const renderTabView = () => {
    return (
      <div className={styles.medicalRecordsContainer}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h1>Medical Records</h1>
            <p>View and manage patient medical records</p>
          </div>
        </div>

        <Card className={styles.contentCard}>
          <div className={styles.tabsContainer}>
            <Tabs 
              tabs={RECORD_TYPES.map(type => ({ id: type.id, label: type.label }))} 
              activeTab={activeTab} 
              onTabChange={handleTabChange} 
            />
          </div>

          <div className={styles.filtersContainer}>
            <SearchBox
              placeholder="Search by patient name..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>

          <div className={styles.tableContainer}>
            {isLoading ? (
              <div className={styles.loadingContainer}>
                <LoadingSpinner />
                <p>Loading {activeTab} records...</p>
              </div>
            ) : (
              <>
                {filteredRecords.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No {activeTab} records found</p>
                  </div>
                ) : (
                  <>
                    <Table
                      columns={getColumns()}
                      data={filteredRecords}
                    />
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    );
  };

  return isMainPage ? renderCategoriesView() : renderTabView();
};

export default MedicalRecords; 