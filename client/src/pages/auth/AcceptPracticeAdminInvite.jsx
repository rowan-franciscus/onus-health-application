import React, { useEffect, useState } from 'react';
import { validatePassword } from '../../utils/passwordPolicy';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import axios from 'axios';
import config from '../../config';
import { authSuccess } from '../../store/slices/authSlice';

const AcceptPracticeAdminInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${config.apiUrl}/auth/practice-admin-invite/${token}`);
        setInvite(res.data.invite);
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load invitation');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const passwordError = validatePassword(password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${config.apiUrl}/auth/practice-admin-invite/${token}/accept`,
        { password }
      );
      const { user, tokens } = res.data;
      localStorage.setItem(config.tokenKey, tokens.authToken);
      if (tokens.refreshToken) {
        localStorage.setItem(config.refreshTokenKey, tokens.refreshToken);
      }
      dispatch(authSuccess(user));
      toast.success('Welcome to Onus Health!');
      navigate('/practice-admin/patients');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading invitation…</div>;
  }
  if (error) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#c0392b' }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 460, margin: '4rem auto', padding: '2rem', background: 'white', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
      <h1 style={{ marginTop: 0, fontSize: '1.5rem' }}>Set up your Practice Admin account</h1>
      <p style={{ color: '#555' }}>
        Hi {invite.firstName}, you've been invited to join as a Practice Admin.
      </p>
      <p style={{ color: '#888', fontSize: '0.9rem' }}>
        Account: <strong>{invite.email}</strong>
      </p>

      <form onSubmit={onSubmit} style={{ marginTop: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Create a password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.7rem', borderRadius: 8, border: '1px solid #d0d0d0', boxSizing: 'border-box' }}
            minLength={8}
            required
          />
        </div>
        <div style={{ marginBottom: '1.2rem' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={{ width: '100%', padding: '0.7rem', borderRadius: 8, border: '1px solid #d0d0d0', boxSizing: 'border-box' }}
            minLength={8}
            required
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          style={{ width: '100%', padding: '0.8rem', background: '#6039cc', color: 'white', border: 'none', borderRadius: 8, fontWeight: 500, fontSize: '1rem', cursor: 'pointer' }}
        >
          {submitting ? 'Setting up…' : 'Create account & sign in'}
        </button>
      </form>
    </div>
  );
};

export default AcceptPracticeAdminInvite;
