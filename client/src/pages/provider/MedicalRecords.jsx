import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './MedicalRecords.module.css';
import ApiService from '../../services/api.service';

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
  { id: 'radiology-reports', label: 'Radiology', icon: radiologyIcon },
  { id: 'hospital-records', label: 'Hospital', icon: hospitalIcon },
  { id: 'surgery-records', label: 'Surgery', icon: surgeryIcon }
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

  // Sync activeTab with URL parameter when it changes
  useEffect(() => {
    if (type && type !== activeTab) {
      setActiveTab(type);
      setCurrentPage(1);
      setSearchTerm('');
    }
  }, [type]);

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
      console.log(`Fetching ${recordType} records for provider...`);
      
      // Use ApiService which handles authentication and base URL correctly
      const data = await ApiService.get(`/medical-records/provider/${recordType}`, {
        limit: 10,
        page: currentPage
      });
      
      console.log(`Received ${recordType} data:`, data);
      
      if (data && data.records) {
        // Transform the data to match our component's expected format
        const formattedRecords = data.records.map(record => ({
          id: record._id,
          consultationId: record.consultation?._id,
          patientId: record.patient?._id,
          patientName: record.patient ? 
            `${record.patient.firstName} ${record.patient.lastName}` : 'Unknown Patient',
          date: record.date || record.createdAt,
          createdByPatient: record.createdByPatient || false,
          providerName: record.createdByPatient ? 'Patient (Self)' : 
            (record.provider ? `${record.provider.firstName} ${record.provider.lastName}` : 'Unknown Provider'),
          // Add type-specific properties based on recordType
          ...(recordType === 'vitals' && {
            heartRate: record.heartRate?.value || 'N/A',
            bloodPressure: record.bloodPressure ? 
              `${record.bloodPressure.systolic || 'N/A'}/${record.bloodPressure.diastolic || 'N/A'}` : 'N/A',
            temperature: record.bodyTemperature?.value || 'N/A'
          }),
                      ...(recordType === 'medications' && {
              medication: record.name || 'N/A',
              dosage: record.dosage ? 
                (typeof record.dosage === 'object' ? 
                  `${record.dosage.value || ''} ${record.dosage.unit || ''}`.trim() : 
                  record.dosage) : 'N/A',
              frequency: record.frequency || 'N/A'
            }),
          ...(recordType === 'immunizations' && {
            vaccine: record.vaccineName || 'N/A',
            serialNumber: record.vaccineSerialNumber || 'N/A',
            nextDueDate: record.nextDueDate
          }),
          ...(recordType === 'lab-results' && {
            testName: record.testName || 'N/A',
            labName: record.labName || 'N/A',
            results: record.results || 'N/A'
          }),
          ...(recordType === 'radiology-reports' && {
            scanType: record.typeOfScan || 'N/A',
            bodyPart: record.bodyPartExamined || 'N/A',
            findings: record.findings || 'N/A'
          }),
          ...(recordType === 'hospital-records' && {
            hospitalName: record.hospitalName || 'N/A',
            admissionDate: record.admissionDate,
            reason: record.reasonForHospitalization || 'N/A'
          }),
          ...(recordType === 'surgery-records' && {
            surgeryType: record.typeOfSurgery || 'N/A',
            surgeryDate: record.date,
            reason: record.reason || 'N/A'
          })
        }));
        
        console.log(`Formatted ${recordType} records:`, formattedRecords);
        setRecords(formattedRecords);
        setTotalPages(data.pagination?.pages || 1);
      } else {
        console.log(`No ${recordType} records found in response`);
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

  const handleViewConsultation = (consultationId, recordType) => {
    // Navigate to consultation with the specific tab selected
    const tabMapping = {
      'vitals': 'vitals',
      'medications': 'medication',
      'immunizations': 'immunization',
      'lab-results': 'labResults',
      'radiology-reports': 'radiology',
      'hospital-records': 'hospital',
      'surgery-records': 'surgery'
    };
    
    const tabName = tabMapping[recordType] || 'general';
    navigate(`/provider/consultations/${consultationId}?tab=${tabName}`);
  };

  const handleViewPatient = (patientId) => {
    navigate(`/provider/patients/${patientId}`);
  };

  const handleViewVitals = (recordId) => {
    navigate(`/provider/medical-records/vitals/${recordId}`);
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
        render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
      }
    ];

    const actionColumn = {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      render: (value, row) => (
        <div className={styles.actionButtons}>
          {row.consultationId ? (
            <Button 
              variant="primary" 
              size="small" 
              onClick={() => handleViewConsultation(row.consultationId, activeTab)}
            >
              View Consultation
            </Button>
          ) : (
            <Button 
              variant="primary" 
              size="small" 
              onClick={() => handleViewVitals(row.id)}
            >
              View Record
            </Button>
          )}
          <Button 
            variant="tertiary" 
            size="small" 
            onClick={() => handleViewPatient(row.patientId)}
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
          { header: 'Created By', accessor: 'providerName', sortable: true },
          { header: 'Heart Rate', accessor: 'heartRate', sortable: true },
          { header: 'Blood Pressure', accessor: 'bloodPressure', sortable: true },
          { header: 'Temperature', accessor: 'temperature', sortable: true }
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
            render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' }
        ];
        break;
      case 'lab-results':
        specificColumns = [
          { header: 'Test Name', accessor: 'testName', sortable: true },
          { header: 'Lab Name', accessor: 'labName', sortable: true },
          { header: 'Results', accessor: 'results', sortable: false }
        ];
        break;
      case 'radiology-reports':
        specificColumns = [
          { header: 'Scan Type', accessor: 'scanType', sortable: true },
          { header: 'Body Part', accessor: 'bodyPart', sortable: true },
          { header: 'Findings', accessor: 'findings', sortable: false }
        ];
        break;
      case 'hospital-records':
        specificColumns = [
          { header: 'Hospital', accessor: 'hospitalName', sortable: true },
          { header: 'Admission Date', accessor: 'admissionDate', sortable: true,
            render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' },
          { header: 'Reason', accessor: 'reason', sortable: false }
        ];
        break;
      case 'surgery-records':
        specificColumns = [
          { header: 'Surgery Type', accessor: 'surgeryType', sortable: true },
          { header: 'Surgery Date', accessor: 'surgeryDate', sortable: true,
            render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' },
          { header: 'Reason', accessor: 'reason', sortable: false }
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