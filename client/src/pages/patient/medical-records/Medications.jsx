import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../utils/dateUtils';
import medicalRecordsService from '../../../services/medicalRecords.service';
import MedicalRecordTypeView from '../../../components/medical-records/MedicalRecordTypeView';
import styles from './Medications.module.css';

const MedicationsRecords = () => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMedicationsRecords = async () => {
      try {
        setIsLoading(true);
        const data = await medicalRecordsService.getMedicationsRecords();
        setRecords(data.records || []);
        setError(null);
      } catch (err) {
        setError(err);
        console.error('Error fetching medications records:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMedicationsRecords();
  }, []);

  // Format dosage for display
  const formatDosage = (medication) => {
    if (!medication?.dosage) return 'N/A';
    
    // Handle both object and string format
    if (typeof medication.dosage === 'object') {
      const { value, unit } = medication.dosage;
      if (!value) return 'N/A';
      return `${value} ${unit || ''}`;
    }
    
    return medication.dosage;
  };

  // Format date range for display
  const formatDateRange = (medication) => {
    if (!medication?.startDate) return 'N/A';
    
    const start = formatDate(medication.startDate);
    if (!medication.endDate) {
      return `${start} - Present`;
    }
    
    const end = formatDate(medication.endDate);
    return `${start} - ${end}`;
  };

  // Get status of medication (active or completed)
  const getMedicationStatus = (medication) => {
    if (!medication.endDate) return 'Active';
    
    const today = new Date();
    const endDate = new Date(medication.endDate);
    return today > endDate ? 'Completed' : 'Active';
  };

  // Handle navigation to consultation view
  const handleViewConsultation = (consultationId) => {
    navigate(`/patient/consultations/${consultationId}?tab=medications`);
  };

  // Render table headers
  const renderTableHeaders = () => {
    return (
      <>
        <th>Date</th>
        <th>Provider</th>
        <th>Medication</th>
        <th>Dosage</th>
        <th>Frequency</th>
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
        <td>{record.nameOfMedication || 'N/A'}</td>
        <td>{formatDosage(record)}</td>
        <td>{record.frequency || 'N/A'}</td>
        <td>{record.reasonForPrescription || 'N/A'}</td>
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
      title="Medications"
      recordType="medications"
      records={records}
      isLoading={isLoading}
      error={error}
      renderTableHeaders={renderTableHeaders}
      renderRecordContent={renderRecordContent}
      searchFields={['date', 'provider', 'nameOfMedication', 'frequency', 'reasonForPrescription']}
      noRecordsMessage="No medication records found. Your health provider will add medications during consultations."
    />
  );
};

export default MedicationsRecords; 