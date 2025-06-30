import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../utils/dateUtils';
import medicalRecordsService from '../../../services/medicalRecords.service';
import MedicalRecordTypeView from '../../../components/medical-records/MedicalRecordTypeView';
import styles from './Vitals.module.css';

const VitalsRecords = () => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVitalsRecords = async () => {
      try {
        setIsLoading(true);
        const data = await medicalRecordsService.getVitalsRecords();
        setRecords(data.records || []);
        setError(null);
      } catch (err) {
        setError(err);
        console.error('Error fetching vitals records:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVitalsRecords();
  }, []);

  // Format blood pressure for display
  const formatBloodPressure = (record) => {
    if (!record?.bloodPressure) return 'N/A';
    const { systolic, diastolic, unit } = record.bloodPressure;
    if (!systolic || !diastolic) return 'N/A';
    return `${systolic}/${diastolic} ${unit || 'mmHg'}`;
  };

  // Format value with unit for display
  const formatValueWithUnit = (field) => {
    if (!field) return 'N/A';
    const { value, unit } = field;
    if (value === undefined || value === null) return 'N/A';
    return `${value} ${unit || ''}`;
  };

  // Handle navigation to consultation view
  const handleViewConsultation = (consultationId) => {
    navigate(`/patient/consultations/${consultationId}?tab=vitals`);
  };

  // Render table headers
  const renderTableHeaders = () => {
    return (
      <>
        <th>Date</th>
        <th>Provider</th>
        <th>Heart Rate</th>
        <th>Blood Pressure</th>
        <th>Body Temperature</th>
        <th>Blood Glucose</th>
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
        <td>{formatValueWithUnit(record.heartRate)}</td>
        <td>{formatBloodPressure(record)}</td>
        <td>{formatValueWithUnit(record.bodyTemperature)}</td>
        <td>{formatValueWithUnit(record.bloodGlucose)}</td>
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
      title="Vitals"
      recordType="vitals"
      records={records}
      isLoading={isLoading}
      error={error}
      renderTableHeaders={renderTableHeaders}
      renderRecordContent={renderRecordContent}
      searchFields={['date', 'provider', 'heartRate.value', 'bloodPressure.systolic', 'bloodPressure.diastolic']}
      noRecordsMessage="No vitals records found. Your health provider will add vitals during consultations."
    />
  );
};

export default VitalsRecords; 