import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import Button from '../../components/common/Button';
import ConnectionService from '../../services/connection.service';
import ProviderPatientList from './ProviderPatientList';
import styles from './Patients.module.css';

const EllipsisMenu = ({ patient, canRequestFullAccess, onRequestFullAccess, actionLoading }) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      const inButton = buttonRef.current && buttonRef.current.contains(e.target);
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!inButton && !inDropdown) setOpen(false);
    };
    const handleScroll = () => setOpen(false);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 190 });
    }
    setOpen(prev => !prev);
  };

  const handleAction = (fn) => {
    setOpen(false);
    fn();
  };

  const dropdown = open && ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      className={styles.dropdownMenu}
      style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
    >
      <button
        className={styles.dropdownItem}
        onClick={() => handleAction(() => navigate(`/provider/patients/${patient.id}`))}
      >
        View Patient Profile
      </button>
      <button
        className={styles.dropdownItem}
        onClick={() => handleAction(() => navigate(`/provider/consultations/new?patientId=${patient.id}`))}
      >
        New Consultation
      </button>
      <button
        className={styles.dropdownItem}
        onClick={() => handleAction(() => navigate(`/provider/hospital-records?patientId=${patient.id}`))}
      >
        Admit
      </button>
      <button
        className={styles.dropdownItem}
        onClick={() => handleAction(() => navigate(`/provider/surgeries?patientId=${patient.id}`))}
      >
        Surgery
      </button>
      {canRequestFullAccess && (
        <button
          className={styles.dropdownItem}
          onClick={() => handleAction(() => onRequestFullAccess())}
          disabled={actionLoading}
        >
          {actionLoading ? 'Requesting...' : 'Request Full Access'}
        </button>
      )}
    </div>,
    document.body
  );

  return (
    <div className={styles.ellipsisWrapper} ref={buttonRef}>
      <button
        className={styles.ellipsisButton}
        onClick={handleToggle}
        aria-label="Patient actions"
      >
        •••
      </button>
      {dropdown}
    </div>
  );
};

const ProviderPatients = () => {
  const navigate = useNavigate();
  const user = useSelector(state => state.auth.user);
  const verificationStatus = user?.isVerified;
  const [actionLoading, setActionLoading] = useState({ id: null, action: null });

  const handleAddPatient = () => navigate('/provider/patients/add');

  const handleRequestFullAccess = async (patient, refresh) => {
    if (!patient.connectionId) {
      toast.error('No connection found for this patient');
      return;
    }

    setActionLoading({ id: patient.id, action: 'requestFullAccess' });
    try {
      await ConnectionService.requestFullAccess(patient.connectionId);
      toast.success('Full access request sent to patient');
      await refresh();
    } catch (error) {
      console.error('Error requesting full access:', error);
      toast.error(error.response?.data?.message || 'Failed to request full access');
    } finally {
      setActionLoading({ id: null, action: null });
    }
  };

  const canRequestFullAccess = (patient) =>
    patient.accessLevel === 'limited' &&
    patient.fullAccessStatus !== 'pending' &&
    patient.connectionId;

  const renderActions = (patient, { refresh }) => (
    <EllipsisMenu
      patient={patient}
      canRequestFullAccess={canRequestFullAccess(patient)}
      onRequestFullAccess={() => handleRequestFullAccess(patient, refresh)}
      actionLoading={actionLoading.id === patient.id}
    />
  );

  const headerAction = (
    <Button
      variant="primary"
      className={styles.addPatientBtn}
      onClick={handleAddPatient}
      disabled={!verificationStatus}
    >
      Add New Patient
    </Button>
  );

  return (
    <ProviderPatientList
      title="All Patients"
      subtitle="Manage your patients and their consultations"
      headerAction={headerAction}
      renderActions={renderActions}
    />
  );
};

export default ProviderPatients;
