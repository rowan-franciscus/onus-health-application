import React, { useState, useEffect } from 'react';
import { formatDate } from '../../../utils/dateUtils';
import medicalRecordsService from '../../../services/medicalRecords.service';
import MedicalRecordTypeView from '../../../components/medical-records/MedicalRecordTypeView';
import styles from './Surgery.module.css';

const SurgeryRecords = () => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSurgeryRecords = async () => {
      try {
        setIsLoading(true);
        const data = await medicalRecordsService.getSurgeryRecords();
        setRecords(data.records || []);
        setError(null);
      } catch (err) {
        setError(err);
        console.error('Error fetching surgery records:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSurgeryRecords();
  }, []);

  // Get complexity level based on surgery type
  const getComplexityLevel = (surgery) => {
    if (!surgery.type) return 'N/A';
    
    const minorSurgeries = [
      'biopsy', 'cyst removal', 'mole removal', 'minor', 'simple', 'routine',
      'endoscopy', 'colonoscopy', 'laser', 'local', 'cataract', 'tooth extraction'
    ];
    
    const majorSurgeries = [
      'open heart', 'bypass', 'transplant', 'brain', 'spinal', 'hip replacement',
      'knee replacement', 'major', 'complex', 'radical', 'reconstruction', 'amputation'
    ];
    
    const surgeryType = surgery.type.toLowerCase();
    
    if (minorSurgeries.some(term => surgeryType.includes(term))) {
      return 'Minor';
    } else if (majorSurgeries.some(term => surgeryType.includes(term))) {
      return 'Major';
    } else {
      return 'Moderate';
    }
  };

  // Truncate long text with ellipsis
  const truncateText = (text, maxLength = 50) => {
    if (!text) return 'N/A';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Render table headers
  const renderTableHeaders = () => {
    return (
      <>
        <th>Surgery Type</th>
        <th>Date</th>
        <th>Reason</th>
        <th>Complications</th>
        <th>Recovery Notes</th>
        <th>Complexity</th>
      </>
    );
  };

  // Render record row content
  const renderRecordContent = (record) => {
    const complexity = getComplexityLevel(record);
    return (
      <>
        <td>{record.type || 'N/A'}</td>
        <td>{formatDate(record.date)}</td>
        <td title={record.reason}>{truncateText(record.reason)}</td>
        <td title={record.complications}>{truncateText(record.complications) || 'None'}</td>
        <td title={record.recoveryNotes}>{truncateText(record.recoveryNotes)}</td>
        <td>
          <span className={`${styles.complexity} ${styles[complexity.toLowerCase()]}`}>
            {complexity}
          </span>
        </td>
      </>
    );
  };

  return (
    <MedicalRecordTypeView
      title="Surgery Records"
      recordType="surgery-records"
      records={records}
      isLoading={isLoading}
      error={error}
      renderTableHeaders={renderTableHeaders}
      renderRecordContent={renderRecordContent}
      searchFields={['type', 'reason', 'complications', 'recoveryNotes']}
      noRecordsMessage="No surgery records found. Your health provider will add surgery records during consultations."
    />
  );
};

export default SurgeryRecords; 