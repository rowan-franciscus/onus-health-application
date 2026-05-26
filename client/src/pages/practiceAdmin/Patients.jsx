import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import PracticeAdminService from '../../services/practiceAdmin.service';
import styles from './Patients.module.css';

const calculateAge = (dob) => {
  if (!dob) return '—';
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return '—';
  const ageDiff = Date.now() - birth.getTime();
  return Math.abs(new Date(ageDiff).getUTCFullYear() - 1970);
};

const truncateId = (id) => (id ? `${String(id).slice(0, 6)}…` : '');

const EllipsisMenu = ({ patient }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const ddRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        ddRef.current && !ddRef.current.contains(e.target)
      ) setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.right - 200 });
    }
    setOpen(v => !v);
  };

  const go = (path) => { setOpen(false); navigate(path); };

  const dropdown = open && ReactDOM.createPortal(
    <div ref={ddRef} className={styles.dropdownMenu} style={{ position: 'fixed', top: pos.top, left: pos.left }}>
      <button className={styles.dropdownItem} onClick={() => go(`/practice-admin/patients/${patient._id}`)}>View profile (operational)</button>
      <button className={styles.dropdownItem} onClick={() => go(`/practice-admin/patients/${patient._id}?tab=documents`)}>Upload documents</button>
      <button className={styles.dropdownItem} onClick={() => go(`/practice-admin/billing`)}>Billing</button>
    </div>,
    document.body
  );

  return (
    <>
      <button ref={btnRef} className={styles.ellipsisButton} onClick={toggle} aria-label="Patient actions">•••</button>
      {dropdown}
    </>
  );
};

const PracticeAdminPatients = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await PracticeAdminService.getPatients();
        setPatients(res.patients || []);
      } catch (e) {
        toast.error('Failed to load patients');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = patients.filter(p => {
    if (!search) return true;
    const haystack = [
      p.firstName, p.lastName, p.email,
      String(calculateAge(p.patientProfile?.dateOfBirth))
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>All Patients</h1>
          <p className={styles.subtitle}>Register new patients and manage demographics, insurance and documents.</p>
        </div>
        <button className={styles.addBtn} onClick={() => navigate('/practice-admin/patients/add')}>
          Add New Patient
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.search}
            placeholder="Search patients by name, age, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.tableHeader}>
          <div>Name</div>
          <div>ID</div>
          <div>Age</div>
          <div>Email</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {loading ? (
          <div className={styles.empty}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>No patients yet</div>
        ) : (
          filtered.map(p => (
            <div key={p._id} className={styles.tableRow}>
              <div>
                <Link className={styles.nameLink} to={`/practice-admin/patients/${p._id}`}>
                  {p.firstName} {p.lastName}
                </Link>
              </div>
              <div>{truncateId(p._id)}</div>
              <div>{calculateAge(p.patientProfile?.dateOfBirth)}</div>
              <div>{p.email || '—'}</div>
              <div style={{ textAlign: 'right' }}>
                <EllipsisMenu patient={p} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PracticeAdminPatients;
