import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './Consultations.module.css';
import { formatDate } from '../../utils/dateUtils';

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import SearchBox from '../../components/common/SearchBox';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Badge from '../../components/common/Badge/Badge';
import ConsultationService from '../../services/consultation.service';

const PatientConsultations = () => {
  const [consultations, setConsultations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchConsultations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchConsultations = async () => {
    setIsLoading(true);
    try {
      const response = await ConsultationService.getPatientConsultations();
      const data = response?.consultations || [];

      const formatted = data.map(c => ({
        id: c.id,
        providerName: c.providerName || c.specialist || 'Unknown Provider',
        date: c.rawDate || null,
        reasonForVisit: c.reason || 'N/A',
        status: c.status || 'completed',
        caseStatus: c.caseStatus || 'open',
        visitCount: c.visitCount || 1,
      }));

      setConsultations(formatted);
      setTotalPages(1);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      toast.error('Failed to fetch consultations');
      setConsultations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const filteredConsultations = consultations.filter(c =>
    c.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.reasonForVisit && c.reasonForVisit.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.caseStatus && c.caseStatus.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.date && c.date.toString().includes(searchTerm))
  );

  const columns = [
    {
      title: 'Provider',
      dataIndex: 'providerName',
      sortable: false,
    },
    {
      title: 'Reason for Visit',
      dataIndex: 'reasonForVisit',
      sortable: false,
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
      },
    },
    {
      title: 'Visits',
      dataIndex: 'visitCount',
      sortable: false,
      render: (value, item) => (
        <span className={styles.visitCount}>{item.visitCount || 1}</span>
      ),
    },
    {
      title: 'Case Status',
      dataIndex: 'caseStatus',
      sortable: false,
      render: (value, item) => (
        <Badge variant={item.caseStatus === 'closed' ? 'closed' : 'open'}>
          {item.caseStatus === 'closed' ? 'Closed' : 'Open'}
        </Badge>
      ),
    },
    {
      title: 'Actions',
      dataIndex: 'actions',
      sortable: false,
      render: (value, item) => (
        <div className={styles.actionButtons}>
          <Link to={`/patient/consultations/${item.id}`}>
            <Button variant="tertiary" size="small">View</Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.consultationsContainer}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Consultations</h1>
          <p>View your consultation history and details</p>
        </div>
      </div>

      <Card className={styles.filterCard}>
        <div className={styles.filters}>
          <SearchBox
            placeholder="Search by provider, reason, date, or status..."
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
                <p>{searchTerm ? 'No consultations found' : "You don't have any consultations yet."}</p>
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
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default PatientConsultations;
