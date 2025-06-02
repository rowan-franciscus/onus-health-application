import React, { useState, useEffect } from 'react';
import { formatDate } from '../../../utils/dateUtils';
import medicalRecordsService from '../../../services/medicalRecords.service';
import MedicalRecordTypeView from '../../../components/medical-records/MedicalRecordTypeView';
import styles from './LabResults.module.css';

const LabResultsRecords = () => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Determine result status based on normalRange and value
  const getResultStatus = (labResult) => {
    if (!labResult.normalRange || !labResult.value) return 'N/A';
    
    // Parse normal range (assuming format like "70-99" or "<100")
    const rangeString = labResult.normalRange;
    let isNormal = false;
    
    // Handle different range formats
    if (rangeString.includes('-')) {
      const [min, max] = rangeString.split('-').map(val => parseFloat(val.trim()));
      const value = parseFloat(labResult.value);
      
      isNormal = value >= min && value <= max;
    } else if (rangeString.startsWith('<')) {
      const max = parseFloat(rangeString.substring(1).trim());
      const value = parseFloat(labResult.value);
      
      isNormal = value < max;
    } else if (rangeString.startsWith('>')) {
      const min = parseFloat(rangeString.substring(1).trim());
      const value = parseFloat(labResult.value);
      
      isNormal = value > min;
    } else if (rangeString.startsWith('≤')) {
      const max = parseFloat(rangeString.substring(1).trim());
      const value = parseFloat(labResult.value);
      
      isNormal = value <= max;
    } else if (rangeString.startsWith('≥')) {
      const min = parseFloat(rangeString.substring(1).trim());
      const value = parseFloat(labResult.value);
      
      isNormal = value >= min;
    }
    
    return isNormal ? 'Normal' : 'Abnormal';
  };

  // Render table headers
  const renderTableHeaders = () => {
    return (
      <>
        <th>Test Name</th>
        <th>Lab Name</th>
        <th>Date</th>
        <th>Result</th>
        <th>Normal Range</th>
        <th>Status</th>
      </>
    );
  };

  // Render record row content
  const renderRecordContent = (record) => {
    const status = getResultStatus(record);
    return (
      <>
        <td>{record.testName || 'N/A'}</td>
        <td>{record.labName || 'N/A'}</td>
        <td>{formatDate(record.date)}</td>
        <td>
          {record.value ? 
            `${record.value} ${record.unit || ''}` : 
            'N/A'
          }
        </td>
        <td>{record.normalRange || 'N/A'}</td>
        <td>
          {status !== 'N/A' && (
            <span className={`${styles.status} ${styles[status.toLowerCase()]}`}>
              {status}
            </span>
          )}
          {status === 'N/A' && 'N/A'}
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
      searchFields={['testName', 'labName', 'value']}
      noRecordsMessage="No lab results found. Your health provider will add lab results during consultations."
    />
  );
};

export default LabResultsRecords; 