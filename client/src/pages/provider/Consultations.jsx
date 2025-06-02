import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './Consultations.module.css';

// Component imports
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import SearchBox from '../../components/common/SearchBox';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ApiService from '../../services/api.service';

const Consultations = () => {
  const [consultations, setConsultations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  useEffect(() => {
    // Fetch consultations
    fetchConsultations();
  }, [currentPage, sortField, sortDirection]);

  const fetchConsultations = async () => {
    setIsLoading(true);
    try {
      const response = await ApiService.get('/consultations', {
        page: currentPage,
        limit: 10,
        sort: sortField,
        order: sortDirection
      });

      if (response) {
        // Transform the data to match our component's expected format
        const formattedConsultations = response.map(consultation => ({
          id: consultation._id,
          patientName: consultation.patient ? 
            `${consultation.patient.firstName} ${consultation.patient.lastName}` : 
            'Unknown Patient',
          date: consultation.date ? new Date(consultation.date).toISOString().split('T')[0] : 'N/A',
          reasonForVisit: consultation.general?.reasonForVisit || 'N/A',
          status: consultation.status || 'draft'
        }));
        
        setConsultations(formattedConsultations);
        
        // For now, set totalPages to 1 since the API doesn't return pagination info
        setTotalPages(1);
      } else {
        console.warn('No consultations data received from API');
        setConsultations([]);
        setTotalPages(1);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      toast.error('Failed to fetch consultations');
      
      // Set empty state instead of falling back to mock data
      setConsultations([]);
      setTotalPages(1);
      setIsLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSort = (field) => {
    // Toggle sort direction if clicking on same field
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter consultations based on search term
  const filteredConsultations = consultations.filter(consultation =>
    consultation.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (consultation.reasonForVisit && consultation.reasonForVisit.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Table columns configuration
  const columns = [
    {
      title: 'Patient',
      dataIndex: 'patientName',
      sortable: true
    },
    {
      title: 'Date',
      dataIndex: 'date',
      sortable: true,
      render: (value, item) => {
        if (!item || !item.date || item.date === 'N/A') return 'Not set';
        try {
          return new Date(item.date).toLocaleDateString();
        } catch (error) {
          console.error('Error formatting date:', error);
          return item.date || 'Invalid date';
        }
      }
    },
    {
      title: 'Reason for Visit',
      dataIndex: 'reasonForVisit',
      sortable: false
    },
    {
      title: 'Status',
      dataIndex: 'status',
      sortable: true,
      render: (value, item) => (
        <span className={styles[`status-${(item.status || '').toLowerCase()}`]}>
          {item.status || 'Unknown'}
        </span>
      )
    },
    {
      title: 'Actions',
      dataIndex: 'actions',
      sortable: false,
      render: (value, item) => (
        <div className={styles.actionButtons}>
          <Link to={`/provider/consultations/${item.id}`}>
            <Button variant="tertiary" size="small">View</Button>
          </Link>
        </div>
      )
    }
  ];

  return (
    <div className={styles.consultationsContainer}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Consultations</h1>
          <p>View and manage your patient consultations</p>
        </div>
        <Link to="/provider/consultations/new">
          <Button>+ New Consultation</Button>
        </Link>
      </div>

      <Card className={styles.filterCard}>
        <div className={styles.filters}>
          <SearchBox
            placeholder="Search consultations..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </Card>

      <Card className={styles.tableCard}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <LoadingSpinner />
            <p>Loading consultations...</p>
          </div>
        ) : (
          <>
            {filteredConsultations.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No consultations found</p>
              </div>
            ) : (
              <>
                <Table
                  columns={columns}
                  data={filteredConsultations}
                  emptyMessage="No consultations found"
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
      </Card>
    </div>
  );
};

export default Consultations; 