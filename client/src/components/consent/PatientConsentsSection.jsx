import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Card from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';
import ConsentStatusBadge from './ConsentStatusBadge';
import ConsentService, { errorMessage, isAwaitingConsent } from '../../services/consent.service';
import { formatDate } from '../../utils/dateUtils';
import styles from './PatientConsentsSection.module.css';

const ConsentText = ({ text }) => (
  <div className={styles.consentText}>
    <h4>{text.title}</h4>
    <ul>{text.consentTo.map((line) => <li key={line}>{line}</li>)}</ul>
    <h4>Information that will be held</h4>
    <ul>{text.dataHeld.map((line) => <li key={line}>{line}</li>)}</ul>
    <h4>Withdrawing consent</h4>
    <p>{text.withdrawal}</p>
  </div>
);

/**
 * Signed-in patient's consents to providers who added them via Add New
 * Patient: answer pending requests, and withdraw consent at any time.
 */
const PatientConsentsSection = ({ sectionClassName, descriptionClassName, onChanged }) => {
  const [consents, setConsents] = useState([]);
  const [consentText, setConsentText] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // `${connectionId}:${action}`
  const [expanded, setExpanded] = useState(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState(null);

  const load = async () => {
    try {
      const res = await ConsentService.getMyConsents();
      setConsents(res.consents || []);
      setConsentText(res.consentText);
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to load your consents'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const run = async (connectionId, action, fn, successMessage) => {
    setBusy(`${connectionId}:${action}`);
    try {
      await fn();
      toast.success(successMessage);
      await load();
      if (onChanged) onChanged();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const respond = (c, decision) => run(
    c.connectionId,
    decision,
    () => ConsentService.respondAsPatient(c.connectionId, { decision, textVersion: consentText.version }),
    decision === 'accept' ? `Consent given to ${c.provider.name}` : `You declined consent for ${c.provider.name}`
  );

  const withdraw = async () => {
    const c = confirmWithdraw;
    setConfirmWithdraw(null);
    await run(c.connectionId, 'withdraw', () => ConsentService.withdraw(c.connectionId), `Consent withdrawn from ${c.provider.name}`);
  };

  if (!loading && consents.length === 0) return null;

  return (
    <Card className={sectionClassName}>
      <h2>Provider consent</h2>
      <p className={descriptionClassName}>
        Providers who started a health record for you. They can only add to or view your record while your consent is active.
      </p>

      {loading ? (
        <p>Loading consents…</p>
      ) : consents.map((c) => {
        const pending = isAwaitingConsent(c.status);
        const isBusy = busy && busy.startsWith(`${c.connectionId}:`);
        return (
          <div key={c.connectionId} className={styles.item}>
            <div className={styles.info}>
              <div className={styles.nameRow}>
                <h3>{c.provider.name}</h3>
                <ConsentStatusBadge status={c.status} />
              </div>
              {c.provider.practiceName && <p>Practice: {c.provider.practiceName}</p>}
              <p>Requested: {formatDate(c.requestedAt)}</p>
              {c.respondedAt && <p>Responded: {formatDate(c.respondedAt)}</p>}
              {c.withdrawnAt && <p>Withdrawn: {formatDate(c.withdrawnAt)}</p>}
              {pending && consentText && (
                <button
                  type="button"
                  className={styles.textToggle}
                  onClick={() => setExpanded(expanded === c.connectionId ? null : c.connectionId)}
                >
                  {expanded === c.connectionId ? 'Hide what you are consenting to' : 'What am I consenting to?'}
                </button>
              )}
            </div>
            <div className={styles.actions}>
              {pending && (
                <>
                  <Button onClick={() => respond(c, 'accept')} disabled={isBusy}>
                    {busy === `${c.connectionId}:accept` ? 'Saving…' : 'Give consent'}
                  </Button>
                  <Button variant="secondary" onClick={() => respond(c, 'decline')} disabled={isBusy}>
                    {busy === `${c.connectionId}:decline` ? 'Saving…' : 'Decline'}
                  </Button>
                </>
              )}
              {c.status === 'ACTIVE' && (
                <Button variant="danger" onClick={() => setConfirmWithdraw(c)} disabled={isBusy}>
                  {busy === `${c.connectionId}:withdraw` ? 'Withdrawing…' : 'Withdraw consent'}
                </Button>
              )}
            </div>
            {expanded === c.connectionId && consentText && <ConsentText text={consentText} />}
          </div>
        );
      })}

      <Modal
        isOpen={Boolean(confirmWithdraw)}
        onClose={() => setConfirmWithdraw(null)}
        title="Withdraw consent?"
        size="small"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setConfirmWithdraw(null)}>Cancel</Button>
            <Button variant="danger" onClick={withdraw}>Withdraw consent</Button>
          </>
        )}
      >
        <p>
          {confirmWithdraw?.provider.name} will no longer be able to view or add to your health record.
          This can&apos;t be undone from here.
        </p>
      </Modal>
    </Card>
  );
};

export default PatientConsentsSection;
