import React from 'react';
import styles from './SurgeryNoteFields.module.css';
import {
  bloodGlucoseTypeOptions,
  spo2ContextOptions,
} from '../../../utils/vitalsLabels';

export const NOTE_TYPE_META = {
  'pre-op': {
    short: 'Pre-Op',
    title: 'Pre-Operative Notes',
    help: 'Document pre-operative assessment, patient readiness, and planned approach',
    placeholder: 'Pre-op assessment, patient condition, planned procedure...',
    className: styles.preop,
  },
  'intra-op': {
    short: 'Intra-Op',
    title: 'Intra-Operative Notes',
    help: 'Document the surgical procedure, technique, and intra-operative findings',
    placeholder: 'Procedure details, technique, intra-operative findings...',
    className: styles.intraop,
  },
  'post-op': {
    short: 'Post-Op',
    title: 'Post-Operative Notes',
    help: 'Document immediate post-operative status and instructions',
    placeholder: 'Post-op status, immediate recovery, instructions...',
    className: styles.postop,
  },
  general: {
    short: 'General',
    title: 'General Notes',
    help: 'General surgical note',
    placeholder: 'General notes...',
    className: styles.general,
  },
};

export const NOTE_TYPE_ORDER = ['pre-op', 'intra-op', 'post-op', 'general'];

export const emptySurgeryNoteValues = {
  noteType: 'pre-op',
  noteContent: '',
  vitals: {
    heartRate: '',
    bpSystolic: '',
    bpDiastolic: '',
    temperature: '',
    respiratoryRate: '',
    bloodGlucose: '',
    bloodGlucoseType: 'random',
    spo2: '',
    spo2Context: 'room-air',
  },
  medications: '',
  complications: '',
  recoveryNotes: '',
  generalNotes: '',
};

export const buildSurgeryNotePayload = (values) => {
  const v = values.vitals || {};
  const num = (x) => (x === '' || x === null || x === undefined ? undefined : Number(x));
  const bloodGlucose = num(v.bloodGlucose);
  const spo2 = num(v.spo2);
  return {
    noteType: NOTE_TYPE_ORDER.includes(values.noteType) ? values.noteType : 'general',
    noteContent: values.noteContent || '',
    vitals: {
      heartRate: num(v.heartRate),
      bpSystolic: num(v.bpSystolic),
      bpDiastolic: num(v.bpDiastolic),
      temperature: num(v.temperature),
      respiratoryRate: num(v.respiratoryRate),
      bloodGlucose,
      // Only send context when the paired numeric value is present.
      bloodGlucoseType: bloodGlucose !== undefined ? (v.bloodGlucoseType || '') : '',
      spo2,
      spo2Context: spo2 !== undefined ? (v.spo2Context || '') : '',
    },
    medications: values.medications || '',
    complications: values.complications || '',
    recoveryNotes: values.recoveryNotes || '',
    generalNotes: values.generalNotes || '',
  };
};

const SurgeryNoteFields = ({
  values,
  onChange,
  hideNoteTypeTabs = false,
  hideComplications = false,
}) => {
  const v = values.vitals || {};
  const noteType = NOTE_TYPE_ORDER.includes(values.noteType) ? values.noteType : 'general';
  const meta = NOTE_TYPE_META[noteType];

  const setVital = (key, val) => {
    onChange({ ...values, vitals: { ...v, [key]: val } });
  };

  const setField = (key, val) => {
    onChange({ ...values, [key]: val });
  };

  return (
    <div className={styles.section}>
      {!hideNoteTypeTabs && (
        <div className={styles.tabs}>
          {NOTE_TYPE_ORDER.map((t) => (
            <button
              key={t}
              type="button"
              className={`${styles.tab} ${noteType === t ? styles.tabActive : ''}`}
              onClick={() => setField('noteType', t)}
            >
              {NOTE_TYPE_META[t].short}
            </button>
          ))}
        </div>
      )}

      <div>
        <div className={styles.noteHead}>
          <span className={`${styles.noteBadge} ${meta.className}`}>{meta.short}</span>
          <span className={styles.noteTitle}>{meta.title}</span>
        </div>
        <p className={styles.noteHelp}>{meta.help}</p>
        <div className={styles.field}>
          <textarea
            rows={4}
            value={values.noteContent}
            placeholder={meta.placeholder}
            onChange={(e) => setField('noteContent', e.target.value)}
          />
        </div>
      </div>

      <h3 className={styles.sectionHeader}>Vitals</h3>

      <div className={styles.grid3}>
        <div className={styles.field}>
          <label>HR (bpm)</label>
          <input
            type="number"
            value={v.heartRate ?? ''}
            placeholder="—"
            onChange={(e) => setVital('heartRate', e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label>BP Sys (mmHg)</label>
          <input
            type="number"
            value={v.bpSystolic ?? ''}
            placeholder="—"
            onChange={(e) => setVital('bpSystolic', e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label>BP Dia (mmHg)</label>
          <input
            type="number"
            value={v.bpDiastolic ?? ''}
            placeholder="—"
            onChange={(e) => setVital('bpDiastolic', e.target.value)}
          />
        </div>
      </div>

      <div className={styles.grid3}>
        <div className={styles.field}>
          <label>Temp (°C)</label>
          <input
            type="number"
            step="0.1"
            value={v.temperature ?? ''}
            placeholder="—"
            onChange={(e) => setVital('temperature', e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label>Resp Rate (/min)</label>
          <input
            type="number"
            value={v.respiratoryRate ?? ''}
            placeholder="—"
            onChange={(e) => setVital('respiratoryRate', e.target.value)}
          />
        </div>
        <div />
      </div>

      <div className={styles.grid2}>
        <div className={styles.fieldWithContext}>
          <div className={styles.fieldRow}>
            <label>Glucose (mmol/L)</label>
            <select
              className={styles.contextSelect}
              value={v.bloodGlucoseType || 'random'}
              onChange={(e) => setVital('bloodGlucoseType', e.target.value)}
            >
              {bloodGlucoseTypeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.short}
                </option>
              ))}
            </select>
          </div>
          <input
            type="number"
            step="0.1"
            value={v.bloodGlucose ?? ''}
            placeholder="—"
            onChange={(e) => setVital('bloodGlucose', e.target.value)}
          />
        </div>
        <div className={styles.fieldWithContext}>
          <div className={styles.fieldRow}>
            <label>SpO₂ (%)</label>
            <select
              className={styles.contextSelect}
              value={v.spo2Context || 'room-air'}
              onChange={(e) => setVital('spo2Context', e.target.value)}
            >
              {spo2ContextOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <input
            type="number"
            step="0.1"
            value={v.spo2 ?? ''}
            placeholder="—"
            onChange={(e) => setVital('spo2', e.target.value)}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label>Medications</label>
        <textarea
          rows={3}
          value={values.medications}
          placeholder="Medications administered..."
          onChange={(e) => setField('medications', e.target.value)}
        />
      </div>

      {!hideComplications && (
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label>Complications</label>
            <textarea
              rows={3}
              value={values.complications}
              placeholder="Any complications..."
              onChange={(e) => setField('complications', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label>Recovery Notes</label>
            <textarea
              rows={3}
              value={values.recoveryNotes}
              placeholder="Recovery notes..."
              onChange={(e) => setField('recoveryNotes', e.target.value)}
            />
          </div>
        </div>
      )}

      <div className={styles.field}>
        <label>General Notes</label>
        <textarea
          rows={3}
          value={values.generalNotes}
          placeholder="Additional notes..."
          onChange={(e) => setField('generalNotes', e.target.value)}
        />
      </div>
    </div>
  );
};

export default SurgeryNoteFields;
