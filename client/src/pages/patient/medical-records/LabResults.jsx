import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../utils/dateUtils';
import medicalRecordsService from '../../../services/medicalRecords.service';
import MedicalRecordTypeView from '../../../components/medical-records/MedicalRecordTypeView';
import styles from './LabResults.module.css';

const LabResultsRecords = () => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLabResultsRecords = async () => {
      try {
        setIsLoading(true);
        const data = await medicalRecordsService.getLabResultsRecords();
        setRecords(data.records || []);
        setError(null);
      } catch (err) {
        setError(err);
        console.error('Error fetching lab results records:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLabResultsRecords();
  }, []);

  // Determine result status
  const getResultStatus = (result) => {
    const resultValue = result.results?.toLowerCase() || '';
    
    if (resultValue.includes('normal') || resultValue.includes('negative')) {
      return 'normal';
    } else if (resultValue.includes('abnormal') || resultValue.includes('positive')) {
      return 'abnormal';
    } else {
      return 'pending';
    }
  };

  // Handle navigation to consultation view
  const handleViewConsultation = (consultationId) => {
    navigate(`/patient/consultations/${consultationId}?tab=labResults`);
  };

  // Render table headers
  const renderTableHeaders = () => {
    return (
      <>
        <th>Date</th>
        <th>Provider</th>
        <th>Test Name</th>
        <th>Lab Name</th>
        <th>Results</th>
        <th>Comments</th>
        <th>Actions</th>
      </>
    );
  };

  // Render record row content
  const renderRecordContent = (record) => {
    return (
      <>
        <td>{formatDate(record.date)}</td>
        <td>{record.provider || 'N/A'}</td>
        <td>{record.testName || 'N/A'}</td>
        <td>{record.labName || 'N/A'}</td>
        <td>
          <span className={`${styles.status} ${styles[getResultStatus(record)]}`}>
            {record.results || 'Pending'}
          </span>
        </td>
        <td className={styles.comments}>{record.comments || 'N/A'}</td>
        <td>
          <button 
            className={styles.viewButton}
            onClick={() => handleViewConsultation(record.consultationId)}
          >
            View
          </button>
        </td>
      </>
    );
  };

  return (
    <MedicalRecordTypeView
      title="Lab Results"
      recordType="lab-results"
      records={records}
      isLoading={isLoading}
      error={error}
      renderTableHeaders={renderTableHeaders}
      renderRecordContent={renderRecordContent}
      searchFields={['date', 'provider', 'testName', 'labName', 'results']}
      noRecordsMessage="No lab results found. Your health provider will add lab results during consultations."
    />
  );
};

export default LabResultsRecords; 