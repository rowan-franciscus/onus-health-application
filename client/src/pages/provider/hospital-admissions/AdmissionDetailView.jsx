import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import LoadingSpinner from '../../../components/common/LoadingSpinner';
import Badge from '../../../components/common/Badge/Badge';
import Button from '../../../components/common/Button';
import Timeline from '../../../components/common/Timeline/Timeline';
import ObservationFields, {
  emptyObservationValues,
  buildObservationPayload,
} from '../../../components/forms/ObservationFields/ObservationFields';
import HospitalAdmissionService from '../../../services/hospitalAdmission.service';
import FileService from '../../../services/file.service';
import { formatDate } from '../../../utils/dateUtils';
import {
  bloodGlucoseTypeLabels,
  spo2ContextLabels,
} from '../../../utils/vitalsLabels';

import styles from './Admissions.module.css';

const formatTime = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const providerLabel = (p) => {
  if (!p) return 'Unknown Provider';
  const name = `${p.firstName || ''} ${p.lastName || ''}`.trim();
  if (!name) return 'Unknown Provider';
  return `Dr. ${name}`;
};

const buildChips = (vitals = {}) => {
  const chips = [];
  if (vitals.heartRate !== undefined && vitals.heartRate !== null && vitals.heartRate !== '') {
    chips.push(`HR: ${vitals.heartRate} bpm`);
  }
  if (
    (vitals.bpSystolic !== undefined && vitals.bpSystolic !== null && vitals.bpSystolic !== '') ||
    (vitals.bpDiastolic !== undefined && vitals.bpDiastolic !== null && vitals.bpDiastolic !== '')
  ) {
    chips.push(`BP: ${vitals.bpSystolic ?? '—'}/${vitals.bpDiastolic ?? '—'} mmHg`);
  }
  if (vitals.temperature !== undefined && vitals.temperature !== null && vitals.temperature !== '') {
    chips.push(`Temp: ${vitals.temperature}°C`);
  }
  if (
    vitals.respiratoryRate !== undefined &&
    vitals.respiratoryRate !== null &&
    vitals.respiratoryRate !== ''
  ) {
    chips.push(`RR: ${vitals.respiratoryRate}/min`);
  }
  if (vitals.bloodGlucose !== undefined && vitals.bloodGlucose !== null && vitals.bloodGlucose !== '') {
    const ctx = bloodGlucoseTypeLabels[vitals.bloodGlucoseType] || '';
    chips.push(`Glucose: ${vitals.bloodGlucose} mmol/L${ctx ? ` (${ctx})` : ''}`);
  }
  if (vitals.spo2 !== undefined && vitals.spo2 !== null && vitals.spo2 !== '') {
    const ctx = spo2ContextLabels[vitals.spo2Context] || '';
    chips.push(`SpO₂: ${vitals.spo2}%${ctx ? ` (${ctx})` : ''}`);
  }
  return chips;
};

const AdmissionDetailView = ({ readOnly = false, backLink = '/provider/hospital-admissions' }) => {
  const { admissionId } = useParams();

  const [admission, setAdmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showAddObs, setShowAddObs] = useState(false);
  const [obsValues, setObsValues] = useState(emptyObservationValues);

  const fetchAdmission = async () => {
    setLoading(true);
    try {
      const data = await HospitalAdmissionService.getAdmission(admissionId);
      setAdmission(data);
    } catch {
      toast.error('Failed to load admission');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admissionId]);

  const handleReAdmit = async () => {
    setActing(true);
    try {
      const updated = await HospitalAdmissionService.reAdmitPatient(admissionId);
      setAdmission(updated);
      toast.success('Patient re-admitted');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to re-admit patient');
    } finally {
      setActing(false);
    }
  };

  const handleDischarge = async () => {
    setActing(true);
    try {
      const updated = await HospitalAdmissionService.dischargePatient(admissionId);
      setAdmission(updated);
      toast.success('Patient discharged');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to discharge patient');
    } finally {
      setActing(false);
    }
  };

  const handleAddObservation = async (e) => {
    e.preventDefault();
    setActing(true);
    try {
      const updated = await HospitalAdmissionService.addObservation(
        admissionId,
        buildObservationPayload(obsValues)
      );
      setAdmission(updated);
      setShowAddObs(false);
      setObsValues(emptyObservationValues);
      toast.success('Observation added');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add observation');
    } finally {
      setActing(false);
    }
  };

  const items = useMemo(() => {
    if (!admission) return [];
    const obs = Array.isArray(admission.observations) ? admission.observations : [];
    return obs.map((o, idx) => {
      const chips = buildChips(o.vitals);
      return {
        id: o._id || idx,
        title: `${formatDate(o.recordedAt)}  ${formatTime(o.recordedAt)}  —  ${
          idx === 0 ? 'Initial Observation' : `Observation #${idx + 1}`
        }`,
        subtitle: `Recorded by ${providerLabel(o.recordedBy)}`,
        defaultExpanded: idx === 0,
        content: (
          <div className={styles.obsBody}>
            {chips.length > 0 && (
              <div className={styles.obsSection}>
                <div className={styles.obsLabel}>Vitals</div>
                <div className={styles.chipRow}>
                  {chips.map((c, i) => (
                    <span key={i} className={styles.chip}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {o.medicationsAdministered && (
              <div className={styles.obsSection}>
                <div className={styles.obsLabel}>Medications</div>
                <div className={styles.obsValue}>{o.medicationsAdministered}</div>
              </div>
            )}
            {o.notes && (
              <div className={styles.obsSection}>
                <div className={styles.obsLabel}>Notes</div>
                <div className={styles.obsValue}>{o.notes}</div>
              </div>
            )}
            {(o.assessment || o.plan) && (
              <div className={styles.obsCols}>
                <div>
                  <div className={styles.obsLabel}>Assessment</div>
                  <div className={styles.obsValue}>{o.assessment || '—'}</div>
                </div>
                <div>
                  <div className={styles.obsLabel}>Plan</div>
                  <div className={styles.obsValue}>{o.plan || '—'}</div>
                </div>
              </div>
            )}
          </div>
        ),
      };
    });
  }, [admission]);

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <LoadingSpinner />
        <p>Loading admission...</p>
      </div>
    );
  }

  if (!admission) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <h2>Admission not found</h2>
        <Link to={backLink}>
          <Button>Back to Admissions</Button>
        </Link>
      </div>
    );
  }

  const isAdmitted = admission.status !== 'discharged';
  const patientName =
    admission.patient
      ? `${admission.patient.firstName || ''} ${admission.patient.lastName || ''}`.trim()
      : 'Patient';
  const avatarUrl = admission.patient?.profileImage
    ? FileService.getProfilePictureUrl(
        admission.patient.profileImage,
        admission.patient._id,
        true
      )
    : null;

  return (
    <div className={styles.detailPage}>
      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderAvatar}>
          {avatarUrl && <img src={avatarUrl} alt={patientName} />}
        </div>
        <div className={styles.detailHeaderMain}>
          <h1 className={styles.detailHeaderTitle}>
            {patientName}
            {admission.reasonForHospitalization ? ` — ${admission.reasonForHospitalization}` : ''}
          </h1>
          <div className={styles.detailHeaderMeta}>
            <span>Admitted: {formatDate(admission.admissionDate)}</span>
            <span>Reason: {admission.reasonForHospitalization || '—'}</span>
            <span>Recorded by {providerLabel(admission.provider)}</span>
          </div>
        </div>
        <div>
          {isAdmitted ? (
            <Badge variant="open">● Admitted</Badge>
          ) : (
            <Badge variant="completed">● Discharged</Badge>
          )}
        </div>
      </div>

      <div className={styles.detailBody}>
        <Link to={backLink} className={styles.backLink}>
          ← Back to Admissions
        </Link>

        <Timeline
          items={items}
          trailing={
            isAdmitted ? 'Patient currently admitted — awaiting next observation' : null
          }
        />
      </div>

      {!readOnly && (
        <div className={styles.threadActionBar}>
          <div>
            {isAdmitted ? (
              <button
                className={styles.discharge}
                onClick={handleDischarge}
                disabled={acting}
              >
                ✕ Discharge Patient
              </button>
            ) : (
              <button
                className={styles.readmit}
                onClick={handleReAdmit}
                disabled={acting}
              >
                ↺ Re-admit Patient
              </button>
            )}
          </div>
          {isAdmitted && (
            <button
              className={styles.addObs}
              onClick={() => setShowAddObs(true)}
              disabled={acting}
            >
              + Add Observation
            </button>
          )}
        </div>
      )}

      {showAddObs && (
        <div className={styles.modalOverlay} onClick={() => setShowAddObs(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Add Observation</h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowAddObs(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddObservation}>
              <ObservationFields values={obsValues} onChange={setObsValues} />
              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="tertiary"
                  onClick={() => setShowAddObs(false)}
                  disabled={acting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={acting}>
                  {acting ? 'Saving...' : 'Save Observation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionDetailView;
