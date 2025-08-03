import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../utils/dateUtils';
import medicalRecordsService from '../../../services/medicalRecords.service';
import MedicalRecordTypeView from '../../../components/medical-records/MedicalRecordTypeView';
import Button from '../../../components/common/Button';
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

  // Handle navigation to view vitals record
  const handleViewVitals = (vitalsId) => {
    navigate(`/patient/medical-records/vitals/${vitalsId}`);
  };

  // Handle add vitals navigation
  const handleAddVitals = () => {
    navigate('/patient/medical-records/vitals/add');
  };

  // Render table headers
  const renderTableHeaders = () => {
    return (
      <>
        <th>Date</th>
        <th>Created By</th>
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
    const createdBy = record.createdByPatient ? (
      <span className={styles.createdByPatient}>Self</span>
    ) : (
      <span className={styles.createdByProvider}>{record.provider?.firstName} {record.provider?.lastName || 'Provider'}</span>
    );

    return (
      <>
        <td>{formatDate(record.date)}</td>
        <td>{createdBy}</td>
        <td>{formatValueWithUnit(record.heartRate)}</td>
        <td>{formatBloodPressure(record)}</td>
        <td>{formatValueWithUnit(record.bodyTemperature)}</td>
        <td>{formatValueWithUnit(record.bloodGlucose)}</td>
        <td>
          {record.createdByPatient ? (
            <button 
              className={styles.viewButton}
              onClick={() => handleViewVitals(record._id)}
            >
              View
            </button>
          ) : record.consultation ? (
            <button 
              className={styles.viewButton}
              onClick={() => handleViewConsultation(record.consultation._id || record.consultation)}
            >
              View
            </button>
          ) : (
            <span className={styles.noConsultation}>-</span>
          )}
        </td>
      </>
    );
  };

  return (
    <div className={styles.vitalsPage}>
      <div className={styles.pageHeader}>
        <h1>Vitals Records</h1>
        <Button variant="primary" onClick={handleAddVitals}>
          Add Vitals
        </Button>
      </div>
      <MedicalRecordTypeView
        title="Vitals"
        recordType="vitals"
        records={records}
        isLoading={isLoading}
        error={error}
        renderTableHeaders={renderTableHeaders}
        renderRecordContent={renderRecordContent}
        searchFields={['date', 'provider.firstName', 'provider.lastName', 'heartRate.value', 'bloodPressure.systolic', 'bloodPressure.diastolic']}
        noRecordsMessage="No vitals records found. Your health provider will add vitals during consultations, or you can add your own."
      />
    </div>
  );
};

export default VitalsRecords; 