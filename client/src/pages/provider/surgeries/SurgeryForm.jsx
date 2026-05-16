import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import Button from '../../../components/common/Button';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import SurgeryNoteFields, {
  emptySurgeryNoteValues,
  buildSurgeryNotePayload,
  NOTE_TYPE_ORDER,
  NOTE_TYPE_META,
} from '../../../components/forms/SurgeryNoteFields/SurgeryNoteFields';
import SurgeryService from '../../../services/surgery.service';
import PatientService from '../../../services/patient.service';
import { useAuth } from '../../../contexts/AuthContext';

import styles from './Surgeries.module.css';

const todayIso = () => new Date().toISOString().slice(0, 10);

const SurgeryForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetPatientId = searchParams.get('patientId');
  const { user } = useAuth();

  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState(presetPatientId || '');
  const [surgeryType, setSurgeryType] = useState('');
  const [date, setDate] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [leadSurgeon, setLeadSurgeon] = useState('');
  const [anaesthesiologist, setAnaesthesiologist] = useState('');
  const [note, setNote] = useState(emptySurgeryNoteValues);
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
    return full ? `Dr. ${full}` : '';
  }, [user]);

  useEffect(() => {
    if (providerName) setLeadSurgeon((prev) => prev || providerName);
  }, [providerName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId || !surgeryType || !date || !reason) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        patient: selectedPatientId,
        surgeryType: surgeryType.trim(),
        date,
        reason: reason.trim(),
        leadSurgeon: leadSurgeon.trim(),
        anaesthesiologist: anaesthesiologist.trim(),
        note: buildSurgeryNotePayload(note),
      };
      const created = await SurgeryService.createSurgery(payload);
      toast.success('Surgery record created');
      navigate(`/provider/surgeries/${created._id}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create surgery record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.formPage}>
      <Link to="/provider/surgeries" className={styles.backLink}>
        ← Back to Surgery Records
      </Link>

      <form onSubmit={handleSubmit}>
        <div className={styles.formCard}>
          <h2>Surgery Details</h2>

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

          <div className={styles.formGrid} style={{ marginBottom: 16 }}>
            <div className={styles.formField}>
              <label>
                Surgery Type <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Appendectomy"
                value={surgeryType}
                onChange={(e) => setSurgeryType(e.target.value)}
                required
              />
            </div>
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
          </div>

          <div className={styles.formField} style={{ marginBottom: 16 }}>
            <label>
              Reason <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              placeholder="Reason for surgery"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGrid} style={{ marginBottom: 16 }}>
            <div className={styles.formField}>
              <label>Lead Surgeon</label>
              <input
                type="text"
                value={leadSurgeon}
                onChange={(e) => setLeadSurgeon(e.target.value)}
              />
            </div>
            <div className={styles.formField}>
              <label>Anaesthesiologist</label>
              <input
                type="text"
                placeholder="Name of anaesthesiologist"
                value={anaesthesiologist}
                onChange={(e) => setAnaesthesiologist(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formField}>
            <label>Note Type</label>
            <select
              value={note.noteType}
              onChange={(e) => setNote({ ...note, noteType: e.target.value })}
            >
              {NOTE_TYPE_ORDER.map((t) => (
                <option key={t} value={t}>
                  {NOTE_TYPE_META[t].short}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formCard}>
          <h2>Initial Surgical Note</h2>
          <SurgeryNoteFields values={note} onChange={setNote} hideNoteTypeTabs hideComplications />
        </div>

        <div className={styles.submitRow}>
          <Button
            type="button"
            variant="tertiary"
            onClick={() => navigate('/provider/surgeries')}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Surgery Record'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SurgeryForm;
