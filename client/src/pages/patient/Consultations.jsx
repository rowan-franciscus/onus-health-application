import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './Consultations.module.css';

// Component imports
import SearchBox from '../../components/common/SearchBox';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import ConsultationService from '../../services/consultation.service';

const PatientConsultations = () => {
  const [consultations, setConsultations] = useState([]);
  const [filteredConsultations, setFilteredConsultations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConsultations();
  }, []);

  const fetchConsultations = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await ConsultationService.getPatientConsultations();
      const consultationsData = response?.consultations || [];
      console.log('Fetched consultations:', consultationsData);
      
      setConsultations(consultationsData);
      setFilteredConsultations(consultationsData);
    } catch (err) {
      console.error('Error fetching consultations:', err);
      setError('Failed to load consultations. Please try again later.');
      toast.error('Failed to load consultations');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input
  const handleSearch = (value) => {
    setSearchTerm(value);
    
    if (!value.trim()) {
      setFilteredConsultations(consultations);
      return;
    }
    
    const lowercasedTerm = value.toLowerCase();
    
    const results = consultations.filter(
      (consultation) =>
        (consultation.type || '').toLowerCase().includes(lowercasedTerm) ||
        (consultation.specialist || '').toLowerCase().includes(lowercasedTerm) ||
        (consultation.clinic || '').toLowerCase().includes(lowercasedTerm) ||
        (consultation.reason || '').toLowerCase().includes(lowercasedTerm) ||
        (consultation.date || '').includes(lowercasedTerm)
    );
    
    setFilteredConsultations(results);
  };

  // Render empty state
  const renderEmptyState = () => (
    <div className={styles.emptyState}>
      <h3>No Consultations Found</h3>
      <p>You don't have any consultations recorded yet.</p>
      <p className={styles.hint}>Consultations will appear here once your healthcare providers create them.</p>
    </div>
  );

  return (
    <div className={styles.consultationsContainer}>
      <div className={styles.header}>
        <h1>Consultations</h1>
        <p>View your consultation history and details</p>
      </div>
      
      {error && (
        <div className={styles.errorMessage}>
          {error}
          <Button 
            variant="primary" 
            className={styles.retryButton}
            onClick={fetchConsultations}
          >
            Retry
          </Button>
        </div>
      )}
      
      <Card className={styles.consultationsCard}>
        <div className={styles.searchContainer}>
          <SearchBox
            placeholder="Search consultations by type, doctor, clinic, reason, or date..."
            value={searchTerm}
            onChange={handleSearch}
            className={styles.searchBox}
          />
        </div>
        
        {isLoading ? (
          <div className={styles.loading}>Loading consultations...</div>
        ) : consultations.length === 0 ? (
          renderEmptyState()
        ) : filteredConsultations.length > 0 ? (
          <div className={styles.consultationsList}>
            <div className={styles.consultationsHeader}>
              <div className={styles.date}>Date</div>
              <div className={styles.type}>Type</div>
              <div className={styles.specialist}>Specialist</div>
              <div className={styles.clinic}>Clinic / Practice</div>
              <div className={styles.reason}>Reason for Visit</div>
              <div className={styles.actions}>Actions</div>
            </div>
            
            {filteredConsultations.map((consultation) => (
              <div key={consultation.id} className={styles.consultationRow}>
                <div className={styles.date}>{consultation.date}</div>
                <div className={styles.type}>{consultation.type || 'General'}</div>
                <div className={styles.specialist}>{consultation.specialist || 'Not specified'}</div>
                <div className={styles.clinic}>{consultation.clinic || 'Not specified'}</div>
                <div className={styles.reason}>{consultation.reason || 'Not specified'}</div>
                <div className={styles.actions}>
                  <Link
                    to={`/patient/consultations/${consultation.id}`}
                    className={styles.viewButton}
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noResults}>
            <p>No consultations found matching "{searchTerm}".</p>
            {searchTerm && (
              <button 
                className={styles.clearButton}
                onClick={() => {
                  setSearchTerm('');
                  setFilteredConsultations(consultations);
                }}
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PatientConsultations; 