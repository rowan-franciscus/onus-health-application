import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../utils/dateUtils';
import medicalRecordsService from '../../../services/medicalRecords.service';
import MedicalRecordTypeView from '../../../components/medical-records/MedicalRecordTypeView';
import styles from './Immunizations.module.css';

const ImmunizationsRecords = () => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchImmunizationsRecords = async () => {
      try {
        setIsLoading(true);
        const data = await medicalRecordsService.getImmunizationsRecords();
        setRecords(data.records || []);
        setError(null);
      } catch (err) {
        setError(err);
        console.error('Error fetching immunizations records:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImmunizationsRecords();
  }, []);

  // Determine immunization status based on next due date
  const getImmunizationStatus = (immunization) => {
    if (!immunization.nextDueDate) return 'Completed';
    
    const today = new Date();
    const nextDueDate = new Date(immunization.nextDueDate);
    
    if (today > nextDueDate) {
      return 'Overdue';
    } else {
      // If next due date is within 30 days
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      if (nextDueDate <= thirtyDaysFromNow) {
        return 'Upcoming';
      } else {
        return 'Up to date';
      }
    }
  };

  // Handle navigation to consultation view
  const handleViewConsultation = (consultationId) => {
    navigate(`/patient/consultations/${consultationId}?tab=immunizations`);
  };

  // Render table headers
  const renderTableHeaders = () => {
    return (
      <>
        <th>Date</th>
        <th>Provider</th>
        <th>Vaccine Name</th>
        <th>Date Administered</th>
        <th>Serial Number</th>
        <th>Next Due Date</th>
        <th>Actions</th>
      </>
    );
  };

  // Render record row content
  const renderRecordContent = (record) => {
    const status = getImmunizationStatus(record);
    return (
      <>
        <td>{formatDate(record.date)}</td>
        <td>{record.provider || 'N/A'}</td>
        <td>{record.vaccineName || 'N/A'}</td>
        <td>{formatDate(record.dateAdministered)}</td>
        <td>{record.vaccineSerialNumber || 'N/A'}</td>
        <td>
          {record.nextDueDate ? (
            <span className={`${styles.status} ${styles[status.replace(/\s+/g, '').toLowerCase()]}`}>
              {formatDate(record.nextDueDate)}
            </span>
          ) : (
            'Not required'
          )}
        </td>
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
      title="Immunizations"
      recordType="immunizations"
      records={records}
      isLoading={isLoading}
      error={error}
      renderTableHeaders={renderTableHeaders}
      renderRecordContent={renderRecordContent}
      searchFields={['date', 'provider', 'vaccineName', 'vaccineSerialNumber']}
      noRecordsMessage="No immunization records found. Your health provider will add immunizations during consultations."
    />
  );
};

export default ImmunizationsRecords; 