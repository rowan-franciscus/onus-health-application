import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, getDateDifference } from '../../../utils/dateUtils';
import medicalRecordsService from '../../../services/medicalRecords.service';
import MedicalRecordTypeView from '../../../components/medical-records/MedicalRecordTypeView';
import styles from './Hospital.module.css';

const HospitalRecords = () => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHospitalRecords = async () => {
      try {
        setIsLoading(true);
        const data = await medicalRecordsService.getHospitalRecords();
        setRecords(data.records || []);
        setError(null);
      } catch (err) {
        setError(err);
        console.error('Error fetching hospital records:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHospitalRecords();
  }, []);

  // Calculate duration of hospital stay
  const calculateStayDuration = (admissionDate, dischargeDate) => {
    if (!admissionDate) return 'N/A';
    
    if (!dischargeDate) {
      return 'In progress';
    }
    
    const days = getDateDifference(admissionDate, dischargeDate, 'days');
    return days === 1 ? '1 day' : `${days} days`;
  };

  // Truncate long text with ellipsis
  const truncateText = (text, maxLength = 50) => {
    if (!text) return 'N/A';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Handle navigation to consultation view
  const handleViewConsultation = (consultationId) => {
    navigate(`/patient/consultations/${consultationId}?tab=hospital`);
  };

  // Render table headers
  const renderTableHeaders = () => {
    return (
      <>
        <th>Date</th>
        <th>Provider</th>
        <th>Admission Date</th>
        <th>Discharge Date</th>
        <th>Duration</th>
        <th>Reason</th>
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
        <td>{formatDate(record.admissionDate)}</td>
        <td>{record.dischargeDate ? formatDate(record.dischargeDate) : 'In progress'}</td>
        <td>{calculateStayDuration(record.admissionDate, record.dischargeDate)}</td>
        <td title={record.reasonForHospitalisation}>{truncateText(record.reasonForHospitalisation)}</td>
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
      title="Hospital Records"
      recordType="hospital-records"
      records={records}
      isLoading={isLoading}
      error={error}
      renderTableHeaders={renderTableHeaders}
      renderRecordContent={renderRecordContent}
      searchFields={['date', 'provider', 'reasonForHospitalisation', 'attendingDoctors', 'treatmentsReceived']}
      noRecordsMessage="No hospital records found. Your health provider will add hospital records during consultations."
    />
  );
};

export default HospitalRecords; 