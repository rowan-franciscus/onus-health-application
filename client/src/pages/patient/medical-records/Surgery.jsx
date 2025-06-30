import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../utils/dateUtils';
import medicalRecordsService from '../../../services/medicalRecords.service';
import MedicalRecordTypeView from '../../../components/medical-records/MedicalRecordTypeView';
import styles from './Surgery.module.css';

const SurgeryRecords = () => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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
    if (!surgery.typeOfSurgery) return 'N/A';
    
    const minorSurgeries = [
      'biopsy', 'cyst removal', 'mole removal', 'minor', 'simple', 'routine',
      'endoscopy', 'colonoscopy', 'laser', 'local', 'cataract', 'tooth extraction'
    ];
    
    const majorSurgeries = [
      'open heart', 'bypass', 'transplant', 'brain', 'spinal', 'hip replacement',
      'knee replacement', 'major', 'complex', 'radical', 'reconstruction', 'amputation'
    ];
    
    const surgeryType = surgery.typeOfSurgery.toLowerCase();
    
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

  // Handle navigation to consultation view
  const handleViewConsultation = (consultationId) => {
    navigate(`/patient/consultations/${consultationId}?tab=surgery`);
  };

  // Render table headers
  const renderTableHeaders = () => {
    return (
      <>
        <th>Date</th>
        <th>Provider</th>
        <th>Surgery Type</th>
        <th>Surgery Date</th>
        <th>Reason</th>
        <th>Complications</th>
        <th>Actions</th>
      </>
    );
  };

  // Render record row content
  const renderRecordContent = (record) => {
    const complexity = getComplexityLevel(record);
    return (
      <>
        <td>{formatDate(record.date)}</td>
        <td>{record.provider || 'N/A'}</td>
        <td>{record.typeOfSurgery || 'N/A'}</td>
        <td>{formatDate(record.dateOfSurgery)}</td>
        <td title={record.reason}>{truncateText(record.reason)}</td>
        <td title={record.complications}>{truncateText(record.complications) || 'None'}</td>
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
      title="Surgery Records"
      recordType="surgery-records"
      records={records}
      isLoading={isLoading}
      error={error}
      renderTableHeaders={renderTableHeaders}
      renderRecordContent={renderRecordContent}
      searchFields={['date', 'provider', 'typeOfSurgery', 'reason', 'complications', 'recoveryNotes']}
      noRecordsMessage="No surgery records found. Your health provider will add surgery records during consultations."
    />
  );
};

export default SurgeryRecords; 