import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import ProviderService from '../../services/provider.service';
import styles from './Team.module.css';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');

const Team = () => {
  const user = useSelector((s) => s.auth.user);
  const [practice, setPractice] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [practiceName, setPracticeName] = useState('');
  const [inviteForm, setInviteForm] = useState({ firstName: '', lastName: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadPractice = async () => {
    setLoading(true);
    try {
      const res = await ProviderService.getPractice();
      setPractice(res.practice);
    } catch (e) {
      if (e.response && e.response.status === 404) {
        setPractice(null);
      } else {
        toast.error('Failed to load practice');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPractice(); }, []);

  const openInvite = () => {
    if (!practice) {
      const suggested = user?.lastName ? `Dr. ${user.lastName}'s Practice` : 'My Practice';
      setPracticeName(suggested);
      setShowNameModal(true);
    } else {
      setShowInviteModal(true);
    }
  };

  const onCreatePractice = async (e) => {
    e.preventDefault();
    if (!practiceName.trim()) return;
    setSubmitting(true);
    try {
      const res = await ProviderService.createPractice(practiceName.trim());
      setPractice(res.practice);
      setShowNameModal(false);
      setShowInviteModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create practice');
    } finally {
      setSubmitting(false);
    }
  };

  const onSendInvite = async (e) => {
    e.preventDefault();
    const { firstName, lastName, email } = inviteForm;
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setSubmitting(true);
    try {
      await ProviderService.inviteAdmin({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim()
      });
      toast.success('Invitation sent');
      setInviteForm({ firstName: '', lastName: '', email: '' });
      setShowInviteModal(false);
      await loadPractice();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const onRevoke = async (adminId) => {
    if (!window.confirm('Revoke this Practice Admin\'s access?')) return;
    try {
      await ProviderService.revokeAdmin(adminId);
      toast.success('Access revoked');
      await loadPractice();
    } catch (err) {
      toast.error('Failed to revoke access');
    }
  };

  const admins = (practice && practice.admins) || [];

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Team</h1>
          <p className={styles.subtitle}>Invite Practice Admins to support patient onboarding, billing and document coordination.</p>
        </div>
        <button className={styles.inviteBtn} onClick={openInvite}>+ Invite Practice Admin</button>
      </div>

      <div className={styles.infoBanner}>
        <span className={styles.bannerIcon}>🛡</span>
        <div>
          <p className={styles.bannerTitle}>Practice Admins are operational, not clinical.</p>
          <p className={styles.bannerBody}>
            They can register patients, manage demographics & insurance, upload documents, and process billing. They <strong>cannot</strong> view consultation notes, vitals, physical exams, or edit clinical decisions.
          </p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.tableHeader}>
          <div>Name</div>
          <div>Email</div>
          <div>Status</div>
          <div>Added</div>
          <div>Actions</div>
        </div>
        {loading ? (
          <div className={styles.empty}>Loading…</div>
        ) : admins.length === 0 ? (
          <div className={styles.empty}>No Practice Admins yet</div>
        ) : (
          admins.map(a => {
            const status = a.practiceAdminProfile?.status || 'pending';
            const statusClass = status === 'active' ? styles.statusActive
              : status === 'revoked' ? styles.statusRevoked
              : styles.statusPending;
            return (
              <div key={a._id} className={styles.tableRow}>
                <div>{a.firstName} {a.lastName}</div>
                <div>{a.email}</div>
                <div><span className={statusClass}>{status.charAt(0).toUpperCase() + status.slice(1)}</span></div>
                <div>{fmtDate(a.practiceAdminProfile?.invitedAt)}</div>
                <div>
                  {status !== 'revoked' && (
                    <button className={styles.revokeBtn} onClick={() => onRevoke(a._id)}>⌀ Revoke</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showNameModal && (
        <div className={styles.modalOverlay} onClick={() => !submitting && setShowNameModal(false)}>
          <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={onCreatePractice}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Name your practice</h2>
              <button type="button" className={styles.modalClose} onClick={() => setShowNameModal(false)}>×</button>
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Practice name</label>
              <input
                className={styles.modalInput}
                value={practiceName}
                onChange={(e) => setPracticeName(e.target.value)}
                autoFocus
              />
              <p className={styles.modalHelper}>This is the name of your practice as it appears to your team.</p>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={() => setShowNameModal(false)} disabled={submitting}>Cancel</button>
              <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                {submitting ? 'Creating…' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showInviteModal && (
        <div className={styles.modalOverlay} onClick={() => !submitting && setShowInviteModal(false)}>
          <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={onSendInvite}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Invite Practice Admin</h2>
              <button type="button" className={styles.modalClose} onClick={() => setShowInviteModal(false)}>×</button>
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Full name</label>
              <input
                className={styles.modalInput}
                placeholder="e.g. Sarah Mokoena"
                value={inviteForm.firstName + (inviteForm.lastName ? ' ' + inviteForm.lastName : '')}
                onChange={(e) => {
                  const parts = e.target.value.trim().split(/\s+/);
                  setInviteForm(f => ({ ...f, firstName: parts[0] || '', lastName: parts.slice(1).join(' ') }));
                }}
              />
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Email address</label>
              <input
                type="email"
                className={styles.modalInput}
                placeholder="name@practice.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
              />
              <p className={styles.modalHelper}>They'll receive a one-time link to set up their account. You can revoke access at any time.</p>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnSecondary} onClick={() => setShowInviteModal(false)} disabled={submitting}>Cancel</button>
              <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                {submitting ? 'Sending…' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Team;
