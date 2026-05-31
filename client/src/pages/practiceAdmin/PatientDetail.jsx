import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import PracticeAdminService from '../../services/practiceAdmin.service';
import PhysicalRecordsTab from '../provider/PhysicalRecordsTab';
import styles from './PatientDetail.module.css';

const TABS = [
  { id: 'demographics', label: 'Demographics & Insurance' },
  { id: 'overview', label: 'Read-Only Operational Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'billing', label: 'Billing' }
];

const calcAge = (dob) => {
  if (!dob) return null;
  const b = new Date(dob);
  if (isNaN(b.getTime())) return null;
  const diff = Date.now() - b.getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');

const Demographics = ({ p }) => {
  const dob = p.patientProfile?.dateOfBirth;
  const age = calcAge(dob);
  const addr = p.patientProfile?.address;
  const addrStr = addr
    ? [addr.street, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean).join(', ')
    : '—';
  const ins = p.patientProfile?.insurance || {};
  return (
    <div className={styles.cardsRow}>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Demographics</h3>
        <div className={styles.field}><div className={styles.fieldLabel}>Full Name</div><div className={styles.fieldValue}>{p.firstName} {p.lastName}</div></div>
        <div className={styles.field}><div className={styles.fieldLabel}>Gender</div><div className={styles.fieldValue}>{p.patientProfile?.gender || '—'}</div></div>
        <div className={styles.field}><div className={styles.fieldLabel}>Date of Birth</div><div className={styles.fieldValue}>{fmtDate(dob)}{age != null ? ` (${age} yrs)` : ''}</div></div>
        <div className={styles.field}><div className={styles.fieldLabel}>Email</div><div className={styles.fieldValue}>{p.email || '—'}</div></div>
        <div className={styles.field}><div className={styles.fieldLabel}>Phone</div><div className={styles.fieldValue}>{p.phone || '—'}</div></div>
        <div className={styles.field}><div className={styles.fieldLabel}>Address</div><div className={styles.fieldValue}>{addrStr}</div></div>
      </div>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Insurance</h3>
        <div className={styles.field}><div className={styles.fieldLabel}>Provider</div><div className={styles.fieldValue}>{ins.provider || '—'}</div></div>
        <div className={styles.field}><div className={styles.fieldLabel}>Plan</div><div className={styles.fieldValue}>{ins.plan || '—'}</div></div>
        <div className={styles.field}><div className={styles.fieldLabel}>Member ID</div><div className={styles.fieldValue}>{ins.insuranceNumber || '—'}</div></div>
      </div>
    </div>
  );
};

const Overview = ({ patientId }) => {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await PracticeAdminService.getOperationalOverview(patientId);
        setConsultations(res.consultations || []);
      } catch (e) {
        toast.error('Failed to load operational overview');
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId]);

  return (
    <>
      <div className={styles.infoBanner}>
        <span className={styles.bannerIcon}>🛡</span>
        <div>
          <p className={styles.bannerTitle}>Read-Only Operational Overview</p>
          <p className={styles.bannerBody}>Consultation date, treating provider, diagnosis and billing status for insurance support. Clinical notes, vitals and findings are not visible.</p>
        </div>
      </div>

      <div className={styles.consultationsCard}>
        <h3 className={styles.cardTitle}>Consultations</h3>
        <div className={`${styles.consultationRow} ${styles.consultationHead}`}>
          <div>Date</div>
          <div>Provider</div>
          <div>Diagnosis</div>
        </div>
        {loading ? (
          <div style={{ padding: '1rem', color: '#999' }}>Loading…</div>
        ) : consultations.length === 0 ? (
          <div style={{ padding: '1rem', color: '#999' }}>No consultations yet</div>
        ) : (
          consultations.map(c => (
            <div key={c._id} className={styles.consultationRow}>
              <div>{fmtDate(c.date)}</div>
              <div>{c.provider ? `Dr. ${c.provider.firstName} ${c.provider.lastName}` : '—'}</div>
              <div>{c.general?.diagnosis || '—'}</div>
            </div>
          ))
        )}
      </div>

      <div className={styles.restrictedBanner}>
        <span>🔒</span>
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>Restricted — Clinical Access Only</p>
          <p style={{ margin: '0.2rem 0 0', color: '#666', fontSize: '0.9rem' }}>
            Consultation notes, vitals, physical exam findings and doctor notes are not available in operational view.
          </p>
        </div>
      </div>
    </>
  );
};

const Documents = ({ patientId }) => (
  <PhysicalRecordsTab patientId={patientId} />
);

const Billing = () => {
  const navigate = useNavigate();
  return (
    <div className={styles.billingRedirect}>
      <p>Billing-support overview is managed across all patients in the Billing module.</p>
      <button className={styles.openBillingBtn} onClick={() => navigate('/practice-admin/billing')}>
        Open Billing
      </button>
    </div>
  );
};

const PracticeAdminPatientDetail = () => {
  const { patientId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromQuery = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    TABS.some(t => t.id === tabFromQuery) ? tabFromQuery : 'demographics'
  );
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await PracticeAdminService.getPatient(patientId);
        setPatient(res.patient);
      } catch (e) {
        toast.error('Failed to load patient');
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId]);

  const onTab = (id) => {
    setActiveTab(id);
    setSearchParams(id === 'demographics' ? {} : { tab: id });
  };

  if (loading) return <div className={styles.container}>Loading…</div>;
  if (!patient) return <div className={styles.container}>Patient not found</div>;

  const age = calcAge(patient.patientProfile?.dateOfBirth);

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumb}>
        <Link to="/practice-admin/patients">All Patients</Link>
        {' › '}
        <span>{patient.firstName} {patient.lastName}</span>
      </div>

      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.patientName}>{patient.firstName} {patient.lastName}</h1>
          <p className={styles.patientSub}>
            {patient.patientProfile?.gender || '—'}
            {age != null ? ` · ${age} years` : ''}
            {' · ID: '}{patient._id}
          </p>
        </div>
        <button className={styles.uploadBtn} onClick={() => onTab('documents')}>
          Upload Document
        </button>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${activeTab === t.id ? styles.active : ''}`}
            onClick={() => onTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'demographics' && <Demographics p={patient} />}
      {activeTab === 'overview' && <Overview patientId={patientId} />}
      {activeTab === 'documents' && <Documents patientId={patientId} />}
      {activeTab === 'billing' && <Billing />}
    </div>
  );
};

export default PracticeAdminPatientDetail;
