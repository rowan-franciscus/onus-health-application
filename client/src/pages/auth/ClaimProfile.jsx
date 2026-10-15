import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { validatePassword } from '../../utils/passwordPolicy';
import ConsentService, { errorMessage } from '../../services/consent.service';
import styles from './Auth.module.css';
import consentStyles from '../public/Consent.module.css';
import { ReactComponent as OnusLogo } from '../../assets/logos/onus-logo.svg';

/**
 * Claim a provider-created record by creating an account. The claim link plus
 * the record's date of birth link the account to the existing record, so the
 * patient never ends up with a second one.
 */
const ClaimProfile = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', dateOfBirth: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await ConsentService.getClaim(token);
        setClaim(data);
        setForm((f) => ({ ...f, firstName: data.firstName || '', lastName: data.lastName || '' }));
      } catch (error) {
        setLoadError(errorMessage(error, 'This link could not be loaded.'));
      }
    })();
  }, [token]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const validate = () => {
    const next = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required';
    if (!form.lastName.trim()) next.lastName = 'Last name is required';
    if (!form.dateOfBirth) next.dateOfBirth = 'Date of birth is required';
    const passwordError = validatePassword(form.password);
    if (passwordError) next.password = passwordError;
    if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await ConsentService.claim(token, {
        password: form.password,
        dateOfBirth: form.dateOfBirth,
        firstName: form.firstName,
        lastName: form.lastName
      });
      toast.success('Your profile is now yours. Please sign in.');
      navigate('/sign-in');
    } catch (error) {
      const data = error?.response?.data || {};
      if (error?.response?.status === 422) {
        const left = data.attemptsRemaining;
        setErrors({
          dateOfBirth: left !== undefined
            ? `${errorMessage(error)} You have ${left} attempt${left === 1 ? '' : 's'} left.`
            : errorMessage(error)
        });
      } else if ([404, 423].includes(error?.response?.status)) {
        setLoadError(errorMessage(error));
      } else {
        toast.error(errorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const field = (name, label, type = 'text', extra = {}) => (
    <div className={styles.formGroup}>
      <label htmlFor={name} className={styles.label}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={form[name]}
        onChange={onChange}
        className={`${styles.input} ${errors[name] ? styles.inputError : ''}`}
        {...extra}
      />
      {errors[name] && <div className={styles.errorText}>{errors[name]}</div>}
    </div>
  );

  let content;
  if (loadError) {
    content = (
      <div className={consentStyles.status}>
        <h1 className={styles.title}>Link not available</h1>
        <p>{loadError}</p>
        <Link to="/sign-in" className={consentStyles.secondaryLink}>Go to sign in</Link>
      </div>
    );
  } else if (!claim) {
    content = <p className={consentStyles.status}>Loading…</p>;
  } else {
    content = (
      <>
        <h1 className={styles.title}>Claim your profile</h1>
        <p className={consentStyles.intro}>
          Create an account to own, view and control your health data. Your account will use{' '}
          <strong>{claim.maskedEmail}</strong> and be linked to the record your provider started.
        </p>
        <form onSubmit={onSubmit} className={styles.authForm}>
          {field('firstName', 'First Name*')}
          {field('lastName', 'Last Name*')}
          {field('dateOfBirth', 'Date of birth*', 'date', { max: new Date().toISOString().slice(0, 10) })}
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>Password*</label>
            <div className={styles.passwordInput}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={onChange}
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              />
              <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && <div className={styles.errorText}>{errors.password}</div>}
          </div>
          {field('confirmPassword', 'Confirm Password*', showPassword ? 'text' : 'password')}
          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </>
    );
  }

  return (
    <div className={styles.authPageContainer}>
      <div className={styles.adminAuthCard}>
        <div className={styles.logoContainer}>
          <OnusLogo className={styles.logo} />
        </div>
        {content}
      </div>
    </div>
  );
};

export default ClaimProfile;
