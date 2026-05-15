import React from 'react';
import styles from './ObservationFields.module.css';
import {
  bloodGlucoseTypeOptions,
  spo2ContextOptions,
} from '../../../utils/vitalsLabels';

export const emptyObservationValues = {
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
  medicationsAdministered: '',
  notes: '',
  assessment: '',
  plan: '',
};

export const buildObservationPayload = (values) => {
  const v = values.vitals || {};
  const num = (x) => (x === '' || x === null || x === undefined ? undefined : Number(x));
  return {
    vitals: {
      heartRate: num(v.heartRate),
      bpSystolic: num(v.bpSystolic),
      bpDiastolic: num(v.bpDiastolic),
      temperature: num(v.temperature),
      respiratoryRate: num(v.respiratoryRate),
      bloodGlucose: num(v.bloodGlucose),
      bloodGlucoseType: v.bloodGlucoseType || '',
      spo2: num(v.spo2),
      spo2Context: v.spo2Context || '',
    },
    medicationsAdministered: values.medicationsAdministered || '',
    notes: values.notes || '',
    assessment: values.assessment || '',
    plan: values.plan || '',
  };
};

const ObservationFields = ({ values, onChange }) => {
  const v = values.vitals || {};

  const setVital = (key, val) => {
    onChange({ ...values, vitals: { ...v, [key]: val } });
  };

  const setField = (key, val) => {
    onChange({ ...values, [key]: val });
  };

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionHeader}>Vitals</h3>

      <div className={styles.grid3}>
        <div className={styles.field}>
          <label>Heart Rate (bpm)</label>
          <input
            type="number"
            value={v.heartRate ?? ''}
            placeholder="—"
            onChange={(e) => setVital('heartRate', e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label>BP Systolic (mmHg)</label>
          <input
            type="number"
            value={v.bpSystolic ?? ''}
            placeholder="—"
            onChange={(e) => setVital('bpSystolic', e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label>BP Diastolic (mmHg)</label>
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
          <label>Temperature (°C)</label>
          <input
            type="number"
            step="0.1"
            value={v.temperature ?? ''}
            placeholder="—"
            onChange={(e) => setVital('temperature', e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label>Respiratory Rate (/min)</label>
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
            <label>Blood Glucose (mmol/L)</label>
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
            <label>Blood Oxygen (%)</label>
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
        <label>Medications Administered</label>
        <textarea
          rows={3}
          value={values.medicationsAdministered}
          placeholder="Enter medications (e.g., Paracetamol 500mg IV, Amoxicillin 250mg PO)"
          onChange={(e) => setField('medicationsAdministered', e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label>Notes</label>
        <textarea
          rows={3}
          value={values.notes}
          placeholder="Observation notes"
          onChange={(e) => setField('notes', e.target.value)}
        />
      </div>

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label>Assessment</label>
          <textarea
            rows={3}
            value={values.assessment}
            placeholder="Clinical assessment"
            onChange={(e) => setField('assessment', e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label>Plan</label>
          <textarea
            rows={3}
            value={values.plan}
            placeholder="Care plan"
            onChange={(e) => setField('plan', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default ObservationFields;
