import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import styles from './MedicalRecordTypeView.module.css';

// Import common components
import Card from '../common/Card';
import SearchBox from '../common/SearchBox';
import LoadingIndicator from '../common/LoadingIndicator';

const MedicalRecordTypeView = ({
  title,
  recordType,
  records = [],
  isLoading = false,
  error = null,
  renderRecordContent,
  renderTableHeaders,
  searchFields = [],
  noRecordsMessage = "No records found."
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRecords, setFilteredRecords] = useState([]);

  // Filter records based on search term
  useEffect(() => {
    if (!records.length) {
      setFilteredRecords([]);
      return;
    }

    if (!searchTerm.trim()) {
      setFilteredRecords(records);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = records.filter(record => {
      return searchFields.some(field => {
        const fieldValue = field.split('.').reduce((obj, key) => {
          return obj && obj[key] !== undefined ? obj[key] : null;
        }, record);
        
        if (fieldValue === null) return false;
        
        return String(fieldValue).toLowerCase().includes(searchTermLower);
      });
    });
    
    setFilteredRecords(filtered);
  }, [searchTerm, records, searchFields]);

  // Handle search change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{title}</h1>
        <Link to="/patient/medical-records" className={styles.backLink}>
          Back to Medical Records
        </Link>
      </div>

      <Card className={styles.searchCard}>
        <SearchBox
          placeholder={`Search ${title.toLowerCase()}...`}
          value={searchTerm}
          onChange={handleSearchChange}
          className={styles.searchBox}
        />
      </Card>

      <Card className={styles.recordsCard}>
        {isLoading ? (
          <LoadingIndicator />
        ) : error ? (
          <div className={styles.error}>
            Error loading records: {error.message || 'Unknown error'}
          </div>
        ) : filteredRecords.length > 0 ? (
          <div className={styles.tableContainer}>
            <table className={styles.recordsTable}>
              <thead>
                <tr>
                  {renderTableHeaders()}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record, index) => (
                  <tr key={record._id || index}>
                    {renderRecordContent(record)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.noRecords}>
            {searchTerm ? 'No matching records found.' : noRecordsMessage}
          </div>
        )}
      </Card>
    </div>
  );
};

MedicalRecordTypeView.propTypes = {
  title: PropTypes.string.isRequired,
  recordType: PropTypes.string.isRequired,
  records: PropTypes.array,
  isLoading: PropTypes.bool,
  error: PropTypes.object,
  renderRecordContent: PropTypes.func.isRequired,
  renderTableHeaders: PropTypes.func.isRequired,
  searchFields: PropTypes.arrayOf(PropTypes.string),
  noRecordsMessage: PropTypes.string
};

export default MedicalRecordTypeView; 