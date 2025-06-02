import React, { useState, useEffect } from 'react';
import { formatDate } from '../../../utils/dateUtils';
import medicalRecordsService from '../../../services/medicalRecords.service';
import MedicalRecordTypeView from '../../../components/medical-records/MedicalRecordTypeView';
import styles from './RadiologyReports.module.css';

const RadiologyReportsRecords = () => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Render table headers
  const renderTableHeaders = () => {
    return (
      <>
        <th>Scan Type</th>
        <th>Date</th>
        <th>Body Part</th>
        <th>Findings</th>
        <th>Recommendations</th>
        <th>Status</th>
      </>
    );
  };

  // Render record row content
  const renderRecordContent = (record) => {
    const urgencyLevel = getUrgencyLevel(record);
    return (
      <>
        <td>{record.scanType || 'N/A'}</td>
        <td>{formatDate(record.date)}</td>
        <td>{record.bodyPart || 'N/A'}</td>
        <td title={record.findings}>{truncateText(record.findings)}</td>
        <td title={record.recommendations}>{truncateText(record.recommendations)}</td>
        <td>
          <span className={`${styles.status} ${styles[urgencyLevel.replace(/\s+/g, '').toLowerCase()]}`}>
            {urgencyLevel}
          </span>
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
      searchFields={['scanType', 'bodyPart', 'findings', 'recommendations']}
      noRecordsMessage="No radiology reports found. Your health provider will add radiology reports during consultations."
    />
  );
};

export default RadiologyReportsRecords; 