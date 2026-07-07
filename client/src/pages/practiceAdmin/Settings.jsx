import React, { useState } from 'react';
import { validatePassword } from '../../utils/passwordPolicy';
import { toast } from 'react-toastify';

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

import ApiService from '../../services/api.service';

import styles from '../provider/Settings.module.css';

const PracticeAdminSettings = () => {
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setPw((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!pw.currentPassword) e.currentPassword = 'Current password is required';
    if (!pw.newPassword) e.newPassword = 'New password is required';
    else {
      const passwordError = validatePassword(pw.newPassword);
      if (passwordError) e.newPassword = passwordError;
    }
    if (!pw.confirmPassword) e.confirmPassword = 'Please confirm your new password';
    else if (pw.newPassword !== pw.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await ApiService.put('/users/change-password', {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      toast.success('Password changed successfully');
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      if (err.response?.status === 401) toast.error('Current password is incorrect');
      else toast.error('Failed to change password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Account Settings</h1>
          <p>Manage your account security.</p>
        </div>
      </div>

      <Card className={styles.changePasswordCard}>
        <div className={styles.cardHeader}>
          <h2>Change Password</h2>
          <p>Update your password to maintain account security.</p>
        </div>

        <form onSubmit={onSubmit}>
          <div className={styles.formItem}>
            <Input
              label="Current Password"
              name="currentPassword"
              type="password"
              value={pw.currentPassword}
              onChange={onChange}
              error={errors.currentPassword}
            />
          </div>
          <div className={styles.formItem}>
            <Input
              label="New Password"
              name="newPassword"
              type="password"
              value={pw.newPassword}
              onChange={onChange}
              error={errors.newPassword}
            />
          </div>
          <div className={styles.formItem}>
            <Input
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={pw.confirmPassword}
              onChange={onChange}
              error={errors.confirmPassword}
            />
          </div>
          <div className={styles.formActions}>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Updating…' : 'Update Password'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default PracticeAdminSettings;
