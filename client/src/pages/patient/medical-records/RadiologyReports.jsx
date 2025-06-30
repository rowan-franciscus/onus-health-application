import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../utils/dateUtils';
import medicalRecordsService from '../../../services/medicalRecords.service';
import MedicalRecordTypeView from '../../../components/medical-records/MedicalRecordTypeView';
import styles from './RadiologyReports.module.css';

const RadiologyReportsRecords = () => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRadiologyReportsRecords = async () => {
      try {
        setIsLoading(true);
        const data = await medicalRecordsService.getRadiologyReportsRecords();
        setRecords(data.records || []);
        setError(null);
      } catch (err) {
        setError(err);
        console.error('Error fetching radiology reports records:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRadiologyReportsRecords();
  }, []);

  // Get urgency level based on report findings/recommendations
  const getUrgencyLevel = (report) => {
    if (!report.findings || !report.recommendations) {
      return 'Normal';
    }
    
    const combinedText = (report.findings + ' ' + report.recommendations).toLowerCase();
    
    // Keywords indicating urgent follow-up
    const urgentKeywords = [
      'urgent', 'immediate', 'emergency', 'critical', 'severe', 'abnormal', 
      'concerning', 'suspicious', 'follow-up', 'follow up', 'needs attention'
    ];
    
    const isUrgent = urgentKeywords.some(keyword => combinedText.includes(keyword));
    
    return isUrgent ? 'Follow-up required' : 'Normal';
  };

  // Truncate long text with ellipsis
  const truncateText = (text, maxLength = 50) => {
    if (!text) return 'N/A';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Handle navigation to consultation view
  const handleViewConsultation = (consultationId) => {
    navigate(`/patient/consultations/${consultationId}?tab=radiologyReports`);
  };

  // Render table headers
  const renderTableHeaders = () => {
    return (
      <>
        <th>Date</th>
        <th>Provider</th>
        <th>Scan Type</th>
        <th>Body Part</th>
        <th>Findings</th>
        <th>Recommendations</th>
        <th>Actions</th>
      </>
    );
  };

  // Render record row content
  const renderRecordContent = (record) => {
    const urgencyLevel = getUrgencyLevel(record);
    return (
      <>
        <td>{formatDate(record.date || record.dateOfScan)}</td>
        <td>{record.provider || 'N/A'}</td>
        <td>{record.typeOfScan || 'N/A'}</td>
        <td>{record.bodyPartExamined || 'N/A'}</td>
        <td title={record.findings}>{truncateText(record.findings)}</td>
        <td title={record.recommendations}>{truncateText(record.recommendations)}</td>
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
      title="Radiology Reports"
      recordType="radiology-reports"
      records={records}
      isLoading={isLoading}
      error={error}
      renderTableHeaders={renderTableHeaders}
      renderRecordContent={renderRecordContent}
      searchFields={['date', 'provider', 'typeOfScan', 'bodyPartExamined', 'findings', 'recommendations']}
      noRecordsMessage="No radiology reports found. Your health provider will add radiology reports during consultations."
    />
  );
};

export default RadiologyReportsRecords; 