import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import Button from '../../../components/common/Button';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import BiometricService from '../../../services/biometric.service';
import PatientService from '../../../services/patient.service';
import FileService from '../../../services/file.service';
import { useAuth } from '../../../contexts/AuthContext';

import styles from './Biometrics.module.css';

const todayIso = () => new Date().toISOString().slice(0, 10);

const calculateAge = (dob) => {
  if (!dob) return null;
  try {
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age -= 1;
    }
    return Number.isFinite(age) && age >= 0 ? age : null;
  } catch {
    return null;
  }
};

const formatRecordDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
};

const ProviderPatientBiometrics = () => {
  const { patientId } = useParams();
  const { user } = useAuth();

  const [patient, setPatient] = useState(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  // Form state
  const [date, setDate] = useState(todayIso());
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bodyFatPercentage, setBodyFatPercentage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const providerName = useMemo(() => {
    if (!user) return '';
    const first = user.firstName || user.profile?.professionalInfo?.firstName || '';
    const last = user.lastName || user.profile?.professionalInfo?.lastName || '';
    const full = `${first} ${last}`.trim();
    return full ? `Dr. ${full}` : '';
  }, [user]);

  const liveBmi = useMemo(() => {
    const w = Number(weight);
    const h = Number(height);
    if (!w || !h || !Number.isFinite(w) || !Number.isFinite(h) || h <= 0) return '';
    return (Math.round((w / Math.pow(h / 100, 2)) * 10) / 10).toFixed(1);
  }, [weight, height]);

  const fetchRecords = async () => {
    try {
      const data = await BiometricService.listPatientBiometrics(patientId);
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load biometric records');
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setPatientLoading(true);
    PatientService.getPatientById(patientId)
      .then((data) => { if (!cancelled) setPatient(data?.patient || data); })
      .catch(() => { if (!cancelled) setPatient(null); })
      .finally(() => { if (!cancelled) setPatientLoading(false); });
    return () => { cancelled = true; };
  }, [patientId]);

  useEffect(() => {
    setRecordsLoading(true);
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !weight || !height) {
      toast.error('Please fill in all required fields (Date, Weight, Height)');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { date, weight: Number(weight), height: Number(height) };
      if (bodyFatPercentage !== '') {
        payload.bodyFatPercentage = Number(bodyFatPercentage);
      }
      await BiometricService.createBiometric(patientId, payload);
      toast.success('Biometric record saved');
      setDate(todayIso());
      setWeight('');
      setHeight('');
      setBodyFatPercentage('');
      setRecordsLoading(true);
      fetchRecords();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save biometric record');
    } finally {
      setSubmitting(false);
    }
  };

  // Patient header data
  const patientName = patient
    ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient'
    : 'Patient';
  const avatarUrl =
    patient?.profileImage
      ? FileService.getProfilePictureUrl(patient.profileImage, patient._id, true)
      : null;
  const pp = patient?.patientProfile;
  const gender = pp?.gender || '—';
  const dob = pp?.dateOfBirth || patient?.dateOfBirth;
  const ageVal = calculateAge(dob);
  const ageDisplay = ageVal !== null ? `${ageVal}` : '—';
  const insurance = pp?.insurance?.provider || '—';

  return (
    <div className={styles.detailPage}>
      {/* Header band */}
      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderAvatar}>
          {avatarUrl && <img src={avatarUrl} alt={patientName} />}
        </div>
        <div className={styles.detailHeaderMain}>
          {patientLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <h1 className={styles.detailHeaderTitle}>{patientName}</h1>
              <div className={styles.detailHeaderMeta}>
                <span>Gender: {gender}</span>
                <span>Age: {ageDisplay}</span>
                <span>Insurance: {insurance}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.detailBody}>
        <Link to="/provider/biometrics" className={styles.backLink}>
          ← Back to Biometrics
        </Link>

        {/* Add Biometric Record form */}
        <form onSubmit={handleSubmit}>
          <div className={styles.formCard}>
            <h2>Add Biometric Record</h2>
            <div className={styles.formGrid}>
              {/* Date */}
              <div className={styles.formField}>
                <label>
                  Date <span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              {/* Recorded By */}
              <div className={styles.formField}>
                <label>Recorded By</label>
                <input type="text" value={providerName} disabled readOnly />
              </div>

              {/* Weight */}
              <div className={styles.formField}>
                <label>
                  Weight <span className={styles.required}>*</span>
                </label>
                <div className={styles.inputWithUnit}>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="e.g. 70"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    required
                  />
                  <span className={styles.unitSuffix}>kg</span>
                </div>
              </div>

              {/* Height */}
              <div className={styles.formField}>
                <label>
                  Height <span className={styles.required}>*</span>
                </label>
                <div className={styles.inputWithUnit}>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="e.g. 175"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    required
                  />
                  <span className={styles.unitSuffix}>cm</span>
                </div>
              </div>

              {/* BMI (auto-calculated) */}
              <div className={styles.formField}>
                <label>BMI (auto-calculated)</label>
                <input
                  type="text"
                  value={liveBmi}
                  placeholder="Calculated from weight &amp; height"
                  disabled
                  readOnly
                />
              </div>

              {/* Body Fat Percentage */}
              <div className={styles.formField}>
                <label>Body Fat %</label>
                <div className={styles.inputWithUnit}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="Optional"
                    value={bodyFatPercentage}
                    onChange={(e) => setBodyFatPercentage(e.target.value)}
                  />
                  <span className={styles.unitSuffix}>%</span>
                </div>
              </div>
            </div>

            <div className={styles.submitRow}>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Biometric Record'}
              </Button>
            </div>
          </div>
        </form>

        {/* Previous Records */}
        <div className={styles.previousRecords}>
          <h2>Previous Records</h2>
          {recordsLoading ? (
            <div className={styles.loading}>
              <LoadingSpinner />
              <p>Loading records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className={styles.emptyRecords}>No biometric records yet</div>
          ) : (
            records.map((r) => {
              const provLabel = r.provider
                ? `Dr. ${(r.provider.firstName || '')} ${(r.provider.lastName || '')}`.trim().replace(/Dr\. $/, 'Dr. —')
                : '—';
              const bfDisplay = r.bodyFatPercentage !== undefined && r.bodyFatPercentage !== null
                ? `${r.bodyFatPercentage}%`
                : '—';
              return (
                <div key={r._id} className={styles.recordRow}>
                  <div className={styles.recordLeft}>
                    <span className={styles.recordDate}>{formatRecordDate(r.date)}</span>
                    <span className={styles.recordMeta}>
                      Weight: {r.weight} kg &nbsp;&nbsp; Height: {r.height} cm &nbsp;&nbsp; BMI: {r.bmi} &nbsp;&nbsp; Body Fat: {bfDisplay}
                    </span>
                  </div>
                  <span className={styles.recordProvider}>{provLabel}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderPatientBiometrics;
