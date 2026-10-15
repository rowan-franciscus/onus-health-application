import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ConsentService, { errorMessage } from '../../services/consent.service';
import authStyles from '../auth/Auth.module.css';
import styles from './Consent.module.css';
import { ReactComponent as OnusLogo } from '../../assets/logos/onus-logo.svg';

/**
 * Public consent page reached from the consent email. No account needed:
 * the link token plus the patient's date of birth identify them.
 */
const Consent = () => {
  const { token } = useParams();
  const [request, setRequest] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(null); // 'accept' | 'decline'
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setRequest(await ConsentService.getConsentRequest(token));
      } catch (error) {
        setLoadError(errorMessage(error, 'This link could not be loaded.'));
      }
    })();
  }, [token]);

  const submit = async (decision) => {
    if (!dateOfBirth) {
      setFormError('Please enter your date of birth.');
      return;
    }
    setFormError(null);
    setSubmitting(decision);
    try {
      const res = await ConsentService.respond(token, {
        dateOfBirth,
        decision,
        textVersion: request.consentText.version
      });
      setResult(res);
    } catch (error) {
      const data = error?.response?.data || {};
      if (data.attemptsRemaining !== undefined) {
        setFormError(`${data.message} You have ${data.attemptsRemaining} attempt${data.attemptsRemaining === 1 ? '' : 's'} left.`);
      } else if ([404, 410, 423].includes(error?.response?.status)) {
        // The link can no longer be used: show it as a page-level state
        setLoadError(data.message);
      } else {
        setFormError(errorMessage(error));
      }
    } finally {
      setSubmitting(null);
    }
  };

  const page = (children) => (
    <div className={authStyles.authPageContainer}>
      <div className={authStyles.adminAuthCard}>
        <div className={authStyles.logoContainer}>
          <OnusLogo className={authStyles.logo} />
        </div>
        {children}
      </div>
    </div>
  );

  if (loadError) {
    return page(
      <div className={styles.status}>
        <h1 className={authStyles.title}>Link not available</h1>
        <p>{loadError}</p>
      </div>
    );
  }

  if (!request) {
    return page(<p className={styles.status}>Loading…</p>);
  }

  if (result) {
    const accepted = result.status === 'ACTIVE';
    return page(
      <div className={styles.status}>
        <h1 className={authStyles.title}>{accepted ? 'Thank you, consent given' : 'You declined consent'}</h1>
        <p>
          {accepted
            ? `${request.providerName} can now add to your health record.`
            : `${request.providerName} has been told, and cannot add anything to your record.`}
        </p>
        {result.claimUrl && (
          <div className={styles.claimBox}>
            <h2>Next: claim your profile</h2>
            <p>Create an account to own, view and control your health data, and to change your consent at any time.</p>
            <a href={result.claimUrl} className={styles.linkButton}>Claim your profile</a>
          </div>
        )}
      </div>
    );
  }

  const text = request.consentText;
  const busy = Boolean(submitting);

  return page(
    <>
      <h1 className={authStyles.title}>Your consent is needed</h1>
      <p className={styles.intro}>
        Hi {request.patientFirstName}, <strong>{request.providerName}</strong>
        {request.practiceName && <> at <strong>{request.practiceName}</strong></>} has started a health record
        for you on Onus Health and is asking for your consent.
      </p>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{text.title}</h2>
        <ul>{text.consentTo.map((line) => <li key={line}>{line}</li>)}</ul>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Information that will be held</h2>
        <ul>{text.dataHeld.map((line) => <li key={line}>{line}</li>)}</ul>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Withdrawing consent</h2>
        <p>{text.withdrawal}</p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>If you decline</h2>
        <p>{text.declineNote}</p>
      </div>

      <p className={styles.version}>Consent text version {text.version}</p>

      <form className={styles.dobGroup} onSubmit={(e) => { e.preventDefault(); submit('accept'); }}>
        <div className={authStyles.formGroup}>
          <label htmlFor="dateOfBirth" className={authStyles.label}>Confirm your date of birth</label>
          <input
            id="dateOfBirth"
            type="date"
            value={dateOfBirth}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className={`${authStyles.input} ${formError ? authStyles.inputError : ''}`}
            required
          />
          <div className={styles.hint}>This confirms the record is yours.</div>
          {formError && <div className={authStyles.errorText}>{formError}</div>}
        </div>

        <div className={styles.actions}>
          <button type="submit" className={authStyles.submitButton} disabled={busy}>
            {submitting === 'accept' ? 'Saving…' : 'I give consent'}
          </button>
          <button type="button" className={styles.declineButton} disabled={busy} onClick={() => submit('decline')}>
            {submitting === 'decline' ? 'Saving…' : 'Decline'}
          </button>
        </div>
      </form>
    </>
  );
};

export default Consent;
