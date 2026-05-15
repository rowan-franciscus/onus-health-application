import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import Button from '../../../components/common/Button';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ObservationFields, {
  emptyObservationValues,
  buildObservationPayload,
} from '../../../components/forms/ObservationFields/ObservationFields';
import HospitalAdmissionService from '../../../services/hospitalAdmission.service';
import PatientService from '../../../services/patient.service';
import { useAuth } from '../../../contexts/AuthContext';

import styles from './Admissions.module.css';

const todayIso = () => new Date().toISOString().slice(0, 10);

const AdmissionForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetPatientId = searchParams.get('patientId');
  const { user } = useAuth();

  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState(presetPatientId || '');
  const [hospitalName, setHospitalName] = useState('');
  const [admissionDate, setAdmissionDate] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [observation, setObservation] = useState(emptyObservationValues);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await PatientService.getProviderPatients();
        const list = Array.isArray(data) ? data : data?.patients || [];
        if (!cancelled) setPatients(list);
      } catch {
        if (!cancelled) setPatients([]);
      } finally {
        if (!cancelled) setPatientsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPatient = useMemo(
    () => patients.find((p) => (p._id || p.id) === selectedPatientId),
    [patients, selectedPatientId]
  );

  const providerName = useMemo(() => {
    if (!user) return '';
    const first = user.firstName || user.profile?.professionalInfo?.firstName || '';
    const last = user.lastName || user.profile?.professionalInfo?.lastName || '';
    const full = `${first} ${last}`.trim();
    return full ? `Dr. ${full}` : 'Current Provider';
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId || !hospitalName || !admissionDate || !reason) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        patient: selectedPatientId,
        hospitalName: hospitalName.trim(),
        admissionDate,
        reasonForHospitalization: reason.trim(),
        observation: buildObservationPayload(observation),
      };
      const created = await HospitalAdmissionService.createAdmission(payload);
      toast.success('Patient admitted');
      navigate(`/provider/hospital-admissions/${created._id}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to admit patient');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.formPage}>
      <Link to="/provider/hospital-admissions" className={styles.backLink}>
        ← Back to Admissions
      </Link>

      <form onSubmit={handleSubmit}>
        <div className={styles.formCard}>
          <h2>Admission Details</h2>

          {!presetPatientId && (
            <div className={`${styles.formField} ${styles.fullWidth}`} style={{ marginBottom: 16 }}>
              <label>
                Patient <span className={styles.required}>*</span>
              </label>
              {patientsLoading ? (
                <LoadingSpinner />
              ) : (
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  required
                >
                  <option value="">Select patient...</option>
                  {patients.map((p) => {
                    const id = p._id || p.id;
                    const name = `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email;
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          )}

          {presetPatientId && (
            <div className={`${styles.formField} ${styles.fullWidth}`} style={{ marginBottom: 16 }}>
              <label>Patient</label>
              <input
                type="text"
                value={
                  patientsLoading
                    ? 'Loading patient...'
                    : selectedPatient
                    ? `${selectedPatient.firstName || ''} ${selectedPatient.lastName || ''}`.trim()
                    : 'Patient not found'
                }
                disabled
              />
            </div>
          )}

          <div className={styles.formField} style={{ marginBottom: 16 }}>
            <label>
              Hospital Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              placeholder="Enter hospital name"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGrid} style={{ marginBottom: 16 }}>
            <div className={styles.formField}>
              <label>
                Admission Date <span className={styles.required}>*</span>
              </label>
              <input
                type="date"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                required
              />
            </div>
            <div className={styles.formField}>
              <label>Recorded By</label>
              <input type="text" value={providerName} disabled />
            </div>
          </div>

          <div className={styles.formField}>
            <label>
              Reason for Hospitalization <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              placeholder="Enter reason for hospitalization"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
        </div>

        <div className={styles.formCard}>
          <h2>Initial Observation</h2>
          <ObservationFields values={observation} onChange={setObservation} />
        </div>

        <div className={styles.submitRow}>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Admitting...' : 'Admit Patient'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdmissionForm;
