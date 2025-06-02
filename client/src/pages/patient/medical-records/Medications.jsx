import React, { useState, useEffect } from 'react';
import { formatDate } from '../../../utils/dateUtils';
import medicalRecordsService from '../../../services/medicalRecords.service';
import MedicalRecordTypeView from '../../../components/medical-records/MedicalRecordTypeView';
import styles from './Medications.module.css';

const MedicationsRecords = () => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
    const { value, unit } = medication.dosage;
    if (!value) return 'N/A';
    return `${value} ${unit || ''}`;
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
    if (!medication.isActive) return 'Completed';
    if (!medication.endDate) return 'Active';
    
    const today = new Date();
    const endDate = new Date(medication.endDate);
    return today > endDate ? 'Completed' : 'Active';
  };

  // Render table headers
  const renderTableHeaders = () => {
    return (
      <>
        <th>Name</th>
        <th>Dosage</th>
        <th>Frequency</th>
        <th>Duration</th>
        <th>Reason</th>
        <th>Status</th>
      </>
    );
  };

  // Render record row content
  const renderRecordContent = (record) => {
    return (
      <>
        <td>{record.name || 'N/A'}</td>
        <td>{formatDosage(record)}</td>
        <td>{record.frequency || 'N/A'}</td>
        <td>{formatDateRange(record)}</td>
        <td>{record.reasonForPrescription || 'N/A'}</td>
        <td>
          <span className={`${styles.status} ${styles[getMedicationStatus(record).toLowerCase()]}`}>
            {getMedicationStatus(record)}
          </span>
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
      searchFields={['name', 'frequency', 'reasonForPrescription']}
      noRecordsMessage="No medication records found. Your health provider will add medications during consultations."
    />
  );
};

export default MedicationsRecords; 