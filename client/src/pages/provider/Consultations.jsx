import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './Consultations.module.css';
import { formatDate } from '../../utils/dateUtils';

// Component imports
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import SearchBox from '../../components/common/SearchBox';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ApiService from '../../services/api.service';
import Badge from '../../components/common/Badge/Badge';

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
  }, [currentPage, sortField, sortDirection]); // eslint-disable-line react-hooks/exhaustive-deps

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
          date: consultation.date || null,
          reasonForVisit: consultation.general?.reasonForVisit || 'N/A',
          status: consultation.status || 'draft',
          caseStatus: consultation.caseStatus || 'open',
          visitCount: consultation.visitCount || 1
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

  // Filter consultations based on search term
  const filteredConsultations = consultations.filter(consultation =>
    consultation.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (consultation.reasonForVisit && consultation.reasonForVisit.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (consultation.status && consultation.status.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (consultation.caseStatus && consultation.caseStatus.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (consultation.date && consultation.date.includes(searchTerm))
  );

  // Table columns configuration
  const columns = [
    {
      title: 'Patient',
      dataIndex: 'patientName',
      sortable: true
    },
    {
      title: 'Reason for Visit',
      dataIndex: 'reasonForVisit',
      sortable: false
    },
    {
      title: 'Last Visit',
      dataIndex: 'date',
      sortable: false,
      render: (value, item) => {
        if (!item || !item.date) return 'Not set';
        try {
          const formatted = formatDate(item.date);
          const invalidSentinels = ['Invalid date', 'Error', 'N/A'];
          return !formatted || invalidSentinels.includes(formatted) ? 'Not set' : formatted;
        } catch {
          return 'Not set';
        }
      }
    },
    {
      title: 'Visits',
      dataIndex: 'visitCount',
      sortable: false,
      render: (value, item) => (
        <span className={styles.visitCount}>{item.visitCount || 1}</span>
      )
    },
    {
      title: 'Case Status',
      dataIndex: 'caseStatus',
      sortable: false,
      render: (value, item) => (
        <Badge variant={item.caseStatus === 'closed' ? 'closed' : 'open'}>
          {item.caseStatus === 'closed' ? '● Closed' : '+ Open'}
        </Badge>
      )
    },
    {
      title: 'Actions',
      dataIndex: 'actions',
      sortable: false,
      render: (value, item) => (
        <div className={styles.actionButtons}>
          {item.status === 'draft' ? (
            <Link to={`/provider/consultations/${item.id}/edit`}>
              <Button variant="tertiary" size="small">Edit</Button>
            </Link>
          ) : (
            <Link to={`/provider/consultations/${item.id}`}>
              <Button variant="tertiary" size="small">View</Button>
            </Link>
          )}
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
            placeholder="Search by patient name, reason, date, or status..."
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