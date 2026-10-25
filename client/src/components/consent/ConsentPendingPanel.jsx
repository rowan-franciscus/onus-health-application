import React, { useState } from 'react';
import { toast } from 'react-toastify';
import Card from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';
import ConsentStatusBadge from './ConsentStatusBadge';
import ConsentService, { DEFERRAL_REASONS, errorMessage, isAwaitingConsent } from '../../services/consent.service';
import { formatDate } from '../../utils/dateUtils';
import styles from './ConsentPendingPanel.module.css';

const COPY = {
  PENDING_CONSENT: {
    title: 'Waiting for the patient\'s consent',
    text: 'You can see the details you entered, but you can\'t add clinical information, notes or documents, or share this record, until the patient consents.'
  },
  EXPIRED: {
    title: 'The consent link expired',
    text: 'The patient didn\'t respond within 14 days. Send a new link, or record why they couldn\'t consent.'
  },
  DECLINED: {
    title: 'The patient declined consent',
    text: 'This record is locked. Nothing can be added to it.'
  },
  WITHDRAWN: {
    title: 'The patient withdrew consent',
    text: 'You can no longer view or add to this record.'
  },
  // A connection from before consent existed that hasn't been backfilled yet
  NONE: {
    title: 'Consent isn\'t recorded for this patient',
    text: 'You can\'t view or add clinical information until the patient\'s consent is active.'
  }
};

const show = (value) => value || '—';

/**
 * Provider view of a patient whose consent is not ACTIVE: status, the details
 * entered at registration, and the pending-consent actions (resend, and
 * "Patient couldn't consent now" for pilot instrumentation).
 */
const ConsentPendingPanel = ({ patientId, consent, details, onChanged }) => {
  const [resending, setResending] = useState(false);
  const [deferOpen, setDeferOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [deferError, setDeferError] = useState(null);
  const [saving, setSaving] = useState(false);

  const status = consent.status;
  const copy = COPY[status || 'NONE'] || COPY.PENDING_CONSENT;
  const awaiting = isAwaitingConsent(status);

  const resend = async () => {
    setResending(true);
    try {
      await ConsentService.resend(patientId);
      toast.success('A new consent link has been emailed to the patient.');
      onChanged();
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to resend the consent request'));
    } finally {
      setResending(false);
    }
  };

  const closeDefer = () => {
    setDeferOpen(false);
    setReason('');
    setNote('');
    setDeferError(null);
  };

  const saveDeferral = async () => {
    if (!reason) {
      setDeferError('Please choose a reason.');
      return;
    }
    if (reason === 'other' && !note.trim()) {
      setDeferError('Please describe the reason.');
      return;
    }
    setSaving(true);
    try {
      await ConsentService.recordDeferral(patientId, { reason, note: note.trim() || undefined });
      toast.success('Reason recorded. Consent is still pending.');
      closeDefer();
      onChanged();
    } catch (error) {
      setDeferError(errorMessage(error, 'Failed to record the reason'));
    } finally {
      setSaving(false);
    }
  };

  let meta = null;
  if (status === 'PENDING_CONSENT') {
    if (consent.linkLocked) {
      meta = 'The link was disabled after too many incorrect date-of-birth attempts. Send a new link.';
    } else if (consent.linkExpiresAt) {
      meta = `Link sent ${formatDate(consent.inviteSentAt)} · expires ${formatDate(consent.linkExpiresAt)}`;
    } else if (!details.email) {
      meta = 'No email address on file, so no consent request could be sent.';
    }
  }

  return (
    <>
      <div className={`${styles.banner} ${awaiting ? styles.pending : styles.locked}`} role="status">
        <h2 className={styles.bannerTitle}>
          {copy.title}
          <ConsentStatusBadge status={status} />
        </h2>
        <p className={styles.bannerText}>{copy.text}</p>
        {meta && <p className={styles.meta}>{meta}</p>}
        {consent.deferralCount > 0 && (
          <p className={styles.meta}>Recorded as unable to consent {consent.deferralCount} time{consent.deferralCount === 1 ? '' : 's'}.</p>
        )}
        {awaiting && (
          <div className={styles.actions}>
            {consent.canResend && (
              <Button variant="primary" onClick={resend} disabled={resending}>
                {resending ? 'Sending…' : 'Resend consent link'}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setDeferOpen(true)}>
              Patient couldn&apos;t consent now
            </Button>
          </div>
        )}
      </div>

      <Card className={styles.detailsCard}>
        <h3 className={styles.detailsTitle}>Details you entered</h3>
        <dl className={styles.details}>
          <div><dt>Name</dt><dd>{details.firstName} {details.lastName}</dd></div>
          <div><dt>Email</dt><dd>{show(details.email)}</dd></div>
          <div><dt>Mobile</dt><dd>{show(details.phone)}</dd></div>
          <div><dt>Date of birth</dt><dd>{details.patientProfile?.dateOfBirth ? formatDate(details.patientProfile.dateOfBirth) : '—'}</dd></div>
          <div><dt>Gender</dt><dd>{show(details.patientProfile?.gender)}</dd></div>
          <div><dt>Medical aid</dt><dd>{show(details.patientProfile?.insurance?.provider)}</dd></div>
          <div><dt>Plan</dt><dd>{show(details.patientProfile?.insurance?.plan)}</dd></div>
        </dl>
      </Card>

      <Modal
        isOpen={deferOpen}
        onClose={closeDefer}
        title="Patient couldn't consent now"
        size="small"
        footer={(
          <>
            <Button variant="secondary" onClick={closeDefer} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={saveDeferral} disabled={saving}>{saving ? 'Saving…' : 'Record reason'}</Button>
          </>
        )}
      >
        <p className={styles.help}>
          This helps us understand why patients can&apos;t consent at the point of care. It doesn&apos;t change the consent status.
        </p>
        <div className={styles.field}>
          <label htmlFor="deferralReason">Reason*</label>
          <select id="deferralReason" value={reason} onChange={(e) => { setReason(e.target.value); setDeferError(null); }}>
            <option value="">Choose a reason</option>
            {DEFERRAL_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="deferralNote">Details{reason === 'other' ? '*' : ' (optional)'}</label>
          <textarea
            id="deferralNote"
            value={note}
            maxLength={500}
            onChange={(e) => { setNote(e.target.value); setDeferError(null); }}
            placeholder="Don't include clinical information"
          />
        </div>
        {deferError && <div className={styles.error}>{deferError}</div>}
      </Modal>
    </>
  );
};

export default ConsentPendingPanel;
