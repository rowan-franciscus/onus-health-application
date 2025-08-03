import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './ViewVitals.module.css';

// Components
import PageContainer from '../../../components/layouts/PageContainer';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import LoadingIndicator from '../../../components/common/LoadingIndicator';

// Services
import medicalRecordsService from '../../../services/medicalRecords.service';

// Utils
import { formatDate } from '../../../utils/dateUtils';

const ViewVitals = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vitalsRecord, setVitalsRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVitalsRecord();
  }, [id]);

  const fetchVitalsRecord = async () => {
    try {
      setIsLoading(true);
      const response = await medicalRecordsService.getVitalsRecordById(id);
      
      if (response.success && response.record) {
        setVitalsRecord(response.record);
      } else {
        throw new Error('Failed to load vitals record');
      }
    } catch (err) {
      console.error('Error fetching vitals record:', err);
      setError(err.message || 'Failed to load vitals record');
      toast.error('Failed to load vitals record');
    } finally {
      setIsLoading(false);
    }
  };

  const formatValueWithUnit = (field) => {
    if (!field) return 'N/A';
    const { value, unit } = field;
    if (value === undefined || value === null) return 'N/A';
    return `${value} ${unit || ''}`;
  };

  const formatBloodPressure = () => {
    if (!vitalsRecord?.bloodPressure) return 'N/A';
    const { systolic, diastolic, unit } = vitalsRecord.bloodPressure;
    if (!systolic || !diastolic) return 'N/A';
    return `${systolic}/${diastolic} ${unit || 'mmHg'}`;
  };

  const formatBloodGlucose = () => {
    if (!vitalsRecord?.bloodGlucose) return 'N/A';
    const { value, unit, measurementType } = vitalsRecord.bloodGlucose;
    if (value === undefined || value === null) return 'N/A';
    const measurementLabel = measurementType ? ` (${measurementType})` : '';
    return `${value} ${unit || 'mg/dL'}${measurementLabel}`;
  };

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingIndicator />
      </PageContainer>
    );
  }

  if (error || !vitalsRecord) {
    return (
      <PageContainer>
        <div className={styles.errorContainer}>
          <h2>Error</h2>
          <p>{error || 'Vitals record not found'}</p>
          <Button onClick={() => navigate('/patient/medical-records/vitals')}>
            Back to Vitals Records
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className={styles.header}>
        <div>
          <h1>Vitals Record</h1>
          <p className={styles.recordDate}>
            Recorded on {formatDate(vitalsRecord.date || vitalsRecord.createdAt)}
          </p>
          {vitalsRecord.createdByPatient && (
            <span className={styles.selfRecordedBadge}>Self-Recorded</span>
          )}
        </div>
        <Button 
          variant="secondary" 
          onClick={() => navigate('/patient/medical-records/vitals')}
        >
          Back to Vitals
        </Button>
      </div>

      <div className={styles.vitalsGrid}>
        <Card className={styles.vitalCard}>
          <h3>Heart Rate</h3>
          <p className={styles.vitalValue}>
            {formatValueWithUnit(vitalsRecord.heartRate)}
          </p>
        </Card>

        <Card className={styles.vitalCard}>
          <h3>Blood Pressure</h3>
          <p className={styles.vitalValue}>
            {formatBloodPressure()}
          </p>
        </Card>

        <Card className={styles.vitalCard}>
          <h3>Body Temperature</h3>
          <p className={styles.vitalValue}>
            {formatValueWithUnit(vitalsRecord.bodyTemperature)}
          </p>
        </Card>

        <Card className={styles.vitalCard}>
          <h3>Respiratory Rate</h3>
          <p className={styles.vitalValue}>
            {formatValueWithUnit(vitalsRecord.respiratoryRate)}
          </p>
        </Card>

        <Card className={styles.vitalCard}>
          <h3>Blood Glucose</h3>
          <p className={styles.vitalValue}>
            {formatBloodGlucose()}
          </p>
        </Card>

        <Card className={styles.vitalCard}>
          <h3>Blood Oxygen Saturation</h3>
          <p className={styles.vitalValue}>
            {formatValueWithUnit(vitalsRecord.bloodOxygenSaturation)}
          </p>
        </Card>

        <Card className={styles.vitalCard}>
          <h3>BMI</h3>
          <p className={styles.vitalValue}>
            {formatValueWithUnit(vitalsRecord.bmi)}
          </p>
        </Card>

        <Card className={styles.vitalCard}>
          <h3>Body Fat Percentage</h3>
          <p className={styles.vitalValue}>
            {formatValueWithUnit(vitalsRecord.bodyFatPercentage)}
          </p>
        </Card>

        <Card className={styles.vitalCard}>
          <h3>Weight</h3>
          <p className={styles.vitalValue}>
            {formatValueWithUnit(vitalsRecord.weight)}
          </p>
        </Card>

        <Card className={styles.vitalCard}>
          <h3>Height</h3>
          <p className={styles.vitalValue}>
            {formatValueWithUnit(vitalsRecord.height)}
          </p>
        </Card>
      </div>

      {vitalsRecord.notes && (
        <Card className={styles.notesCard}>
          <h3>Notes</h3>
          <p className={styles.notesText}>{vitalsRecord.notes}</p>
        </Card>
      )}

      {vitalsRecord.provider && (
        <Card className={styles.providerCard}>
          <h3>Recorded By</h3>
          <p className={styles.providerName}>
            Dr. {vitalsRecord.provider.firstName} {vitalsRecord.provider.lastName}
          </p>
        </Card>
      )}
    </PageContainer>
  );
};

export default ViewVitals; 