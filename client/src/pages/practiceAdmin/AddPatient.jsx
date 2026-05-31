import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Button from '../../components/common/Button';
import PracticeAdminService from '../../services/practiceAdmin.service';
import styles from '../provider/AddPatient.module.css';

const PracticeAdminAddPatient = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [form, setForm] = useState({
    providerId: '',
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    medicalAidProvider: '',
    plan: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await PracticeAdminService.getPractice();
        const list = (res.practice && res.practice.providers) || [];
        setProviders(list);
        if (list.length === 1) {
          setForm(f => ({ ...f, providerId: list[0]._id }));
        }
      } catch (e) {
        toast.error('Failed to load practice providers');
      }
    })();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.providerId) e.providerId = 'Treating provider is required';
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.gender) e.gender = 'Gender is required';
    if (!form.dateOfBirth) e.dateOfBirth = 'Date of birth is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'Invalid email';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await PracticeAdminService.registerPatient({
        providerId: form.providerId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        medicalAidProvider: form.medicalAidProvider.trim() || undefined,
        plan: form.plan.trim() || undefined
      });
      toast.success(`${form.firstName} ${form.lastName} has been registered.`);
      navigate('/practice-admin/patients');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register patient');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Register New Patient</h1>
        <p className={styles.subtitle}>Add a patient to your practice and assign a treating provider.</p>
      </div>

      <form onSubmit={onSubmit} className={styles.registerForm}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Treating Provider <span className={styles.required}>*</span>
          </label>
          <select
            name="providerId"
            value={form.providerId}
            onChange={onChange}
            className={`${styles.formInput} ${styles.formSelect} ${errors.providerId ? styles.inputError : ''}`}
            disabled={submitting}
          >
            <option value="">Select treating provider</option>
            {providers.map(p => (
              <option key={p._id} value={p._id}>
                Dr. {p.firstName} {p.lastName}
                {p.providerProfile?.specialty ? ` — ${p.providerProfile.specialty}` : ''}
              </option>
            ))}
          </select>
          {errors.providerId && <div className={styles.errorMessage}>{errors.providerId}</div>}
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>First Name <span className={styles.required}>*</span></label>
            <input name="firstName" value={form.firstName} onChange={onChange}
              className={`${styles.formInput} ${errors.firstName ? styles.inputError : ''}`} disabled={submitting} />
            {errors.firstName && <div className={styles.errorMessage}>{errors.firstName}</div>}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Last Name <span className={styles.required}>*</span></label>
            <input name="lastName" value={form.lastName} onChange={onChange}
              className={`${styles.formInput} ${errors.lastName ? styles.inputError : ''}`} disabled={submitting} />
            {errors.lastName && <div className={styles.errorMessage}>{errors.lastName}</div>}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Gender <span className={styles.required}>*</span></label>
            <select name="gender" value={form.gender} onChange={onChange}
              className={`${styles.formInput} ${styles.formSelect} ${errors.gender ? styles.inputError : ''}`} disabled={submitting}>
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer not to say">Prefer not to say</option>
            </select>
            {errors.gender && <div className={styles.errorMessage}>{errors.gender}</div>}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Date of Birth <span className={styles.required}>*</span></label>
            <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={onChange}
              className={`${styles.formInput} ${errors.dateOfBirth ? styles.inputError : ''}`} disabled={submitting} />
            {errors.dateOfBirth && <div className={styles.errorMessage}>{errors.dateOfBirth}</div>}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Phone</label>
            <input name="phone" value={form.phone} onChange={onChange} className={styles.formInput} disabled={submitting} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Email</label>
            <input type="email" name="email" value={form.email} onChange={onChange}
              className={`${styles.formInput} ${errors.email ? styles.inputError : ''}`} disabled={submitting} />
            {errors.email && <div className={styles.errorMessage}>{errors.email}</div>}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Medical Aid Provider</label>
            <input name="medicalAidProvider" value={form.medicalAidProvider} onChange={onChange}
              className={styles.formInput} disabled={submitting} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Plan</label>
            <input name="plan" value={form.plan} onChange={onChange} className={styles.formInput} disabled={submitting} />
          </div>
        </div>

        <div className={styles.formActions}>
          <Button type="button" variant="secondary" onClick={() => navigate('/practice-admin/patients')} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Registering…' : 'Register Patient'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PracticeAdminAddPatient;
