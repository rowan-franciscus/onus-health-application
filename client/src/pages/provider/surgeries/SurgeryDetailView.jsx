import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import LoadingSpinner from '../../../components/common/LoadingSpinner';
import Badge from '../../../components/common/Badge/Badge';
import Button from '../../../components/common/Button';
import Timeline from '../../../components/common/Timeline/Timeline';
import SurgeryNoteFields, {
  emptySurgeryNoteValues,
  buildSurgeryNotePayload,
  NOTE_TYPE_META,
} from '../../../components/forms/SurgeryNoteFields/SurgeryNoteFields';
import SurgeryService from '../../../services/surgery.service';
import FileService from '../../../services/file.service';
import { formatDate } from '../../../utils/dateUtils';
import {
  bloodGlucoseTypeLabels,
  spo2ContextLabels,
} from '../../../utils/vitalsLabels';

import styles from './Surgeries.module.css';

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

const noteBadgeClass = (noteType) => {
  switch (noteType) {
    case 'pre-op':
      return styles.preop;
    case 'intra-op':
      return styles.intraop;
    case 'post-op':
      return styles.postop;
    default:
      return styles.general;
  }
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

const SurgeryDetailView = ({ readOnly = false, backLink = '/provider/surgeries' }) => {
  const { surgeryId } = useParams();

  const [surgery, setSurgery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteValues, setNoteValues] = useState(emptySurgeryNoteValues);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    SurgeryService.getSurgery(surgeryId)
      .then((data) => { if (!cancelled) setSurgery(data); })
      .catch(() => { if (!cancelled) toast.error('Failed to load surgery record'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [surgeryId]);

  const handleReopen = async () => {
    setActing(true);
    try {
      const updated = await SurgeryService.reopenSurgery(surgeryId);
      setSurgery(updated);
      toast.success('Surgery record reopened');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to reopen surgery record');
    } finally {
      setActing(false);
    }
  };

  const handleClose = async () => {
    setActing(true);
    try {
      const updated = await SurgeryService.closeSurgery(surgeryId);
      setSurgery(updated);
      toast.success('Surgery record closed');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to close surgery record');
    } finally {
      setActing(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    setActing(true);
    try {
      const updated = await SurgeryService.addNote(
        surgeryId,
        buildSurgeryNotePayload(noteValues)
      );
      setSurgery(updated);
      setShowAddNote(false);
      setNoteValues(emptySurgeryNoteValues);
      toast.success('Note added');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add note');
    } finally {
      setActing(false);
    }
  };

  const items = useMemo(() => {
    if (!surgery) return [];
    const notes = Array.isArray(surgery.notes) ? surgery.notes : [];
    return notes.map((n, idx) => {
      const chips = buildChips(n.vitals);
      const meta = NOTE_TYPE_META[n.noteType] || NOTE_TYPE_META.general;
      return {
        id: n._id || idx,
        defaultExpanded: idx === 0,
        title: (
          <span className={styles.threadTitle}>
            <span className={`${styles.noteBadge} ${noteBadgeClass(n.noteType)}`}>
              {meta.short}
            </span>
            <span className={styles.timestamp}>
              {formatDate(n.recordedAt)} {formatTime(n.recordedAt)}
            </span>
          </span>
        ),
        badge: <span className={styles.providerName}>{providerLabel(n.recordedBy)}</span>,
        content: (
          <div className={styles.obsBody}>
            {n.noteContent && (
              <div className={styles.obsSection}>
                <div className={styles.obsLabel}>{meta.title}</div>
                <div className={styles.obsValue}>{n.noteContent}</div>
              </div>
            )}
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
            {n.medications && (
              <div className={styles.obsSection}>
                <div className={styles.obsLabel}>Medications</div>
                <div className={styles.obsValue}>{n.medications}</div>
              </div>
            )}
            {n.complications && (
              <div className={styles.obsSection}>
                <div className={styles.complicationsLabel}>Complications</div>
                <div className={styles.complicationsValue}>{n.complications}</div>
              </div>
            )}
            {n.recoveryNotes && (
              <div className={styles.obsSection}>
                <div className={styles.obsLabel}>Recovery Notes</div>
                <div className={styles.obsValue}>{n.recoveryNotes}</div>
              </div>
            )}
            {n.generalNotes && (
              <div className={styles.obsSection}>
                <div className={styles.obsLabel}>Notes</div>
                <div className={styles.obsValue}>{n.generalNotes}</div>
              </div>
            )}
          </div>
        ),
      };
    });
  }, [surgery]);

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <LoadingSpinner />
        <p>Loading surgery record...</p>
      </div>
    );
  }

  if (!surgery) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <h2>Surgery record not found</h2>
        <Link to={backLink}>
          <Button>Back to Surgery Records</Button>
        </Link>
      </div>
    );
  }

  const isOpen = surgery.status !== 'closed';
  const patientName =
    (surgery.patient
      ? `${surgery.patient.firstName || ''} ${surgery.patient.lastName || ''}`.trim()
      : '') || 'Patient';
  const avatarUrl = surgery.patient?.profileImage
    ? FileService.getProfilePictureUrl(
        surgery.patient.profileImage,
        surgery.patient._id,
        true
      )
    : null;

  return (
    <div className={styles.detailPage}>
      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderAvatar}>
          {avatarUrl && <img src={avatarUrl} alt={patientName || 'Patient'} />}
        </div>
        <div className={styles.detailHeaderMain}>
          <h1 className={styles.detailHeaderTitle}>{patientName}</h1>
          <div className={styles.detailHeaderMeta}>
            <span>{surgery.surgeryType || '—'}</span>
            <span>{formatDate(surgery.date)}</span>
            <span>Lead: {surgery.leadSurgeon || '—'}</span>
            <span>Reason: {surgery.reason || '—'}</span>
          </div>
        </div>
        <div>
          {isOpen ? (
            <Badge variant="open">● Open</Badge>
          ) : (
            <Badge variant="completed">● Closed</Badge>
          )}
        </div>
      </div>

      <div className={styles.detailBody}>
        <Link to={backLink} className={styles.backLink}>
          ← Back to Surgery Records
        </Link>

        <Timeline
          items={items}
          trailing={isOpen ? 'Record open — awaiting next note' : null}
        />
      </div>

      {!readOnly && (
        <div className={styles.threadActionBar}>
          <div>
            {isOpen ? (
              <button
                className={styles.closeBtn}
                onClick={handleClose}
                disabled={acting}
              >
                ✕ Close Record
              </button>
            ) : (
              <button
                className={styles.reopenBtn}
                onClick={handleReopen}
                disabled={acting}
              >
                ↺ Reopen
              </button>
            )}
          </div>
          {isOpen && (
            <button
              className={styles.addNote}
              onClick={() => setShowAddNote(true)}
              disabled={acting}
            >
              + Add Note
            </button>
          )}
        </div>
      )}

      {showAddNote && (
        <div className={styles.modalOverlay} onClick={() => setShowAddNote(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>New Surgical Note</h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowAddNote(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddNote}>
              <SurgeryNoteFields values={noteValues} onChange={setNoteValues} />
              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="tertiary"
                  onClick={() => setShowAddNote(false)}
                  disabled={acting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={acting}>
                  {acting ? 'Saving...' : 'Add Note'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurgeryDetailView;
