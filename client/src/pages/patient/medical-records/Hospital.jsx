import React, { useState, useEffect } from 'react';
import { formatDate, getDateDifference } from '../../../utils/dateUtils';
import medicalRecordsService from '../../../services/medicalRecords.service';
import MedicalRecordTypeView from '../../../components/medical-records/MedicalRecordTypeView';
import styles from './Hospital.module.css';

const HospitalRecords = () => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Render table headers
  const renderTableHeaders = () => {
    return (
      <>
        <th>Admission Date</th>
        <th>Discharge Date</th>
        <th>Duration</th>
        <th>Reason</th>
        <th>Attending Doctors</th>
        <th>Treatments</th>
      </>
    );
  };

  // Render record row content
  const renderRecordContent = (record) => {
    return (
      <>
        <td>{formatDate(record.admissionDate)}</td>
        <td>{record.dischargeDate ? formatDate(record.dischargeDate) : 'In progress'}</td>
        <td>{calculateStayDuration(record.admissionDate, record.dischargeDate)}</td>
        <td title={record.reasonForHospitalization}>{truncateText(record.reasonForHospitalization)}</td>
        <td>{record.attendingDoctors || 'N/A'}</td>
        <td title={record.treatmentsReceived}>{truncateText(record.treatmentsReceived)}</td>
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
      searchFields={['reasonForHospitalization', 'attendingDoctors', 'treatmentsReceived']}
      noRecordsMessage="No hospital records found. Your health provider will add hospital records during consultations."
    />
  );
};

export default HospitalRecords; 