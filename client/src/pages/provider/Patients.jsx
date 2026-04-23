import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import Button from '../../components/common/Button';
import ConnectionService from '../../services/connection.service';
import ProviderPatientList from './ProviderPatientList';
import styles from './Patients.module.css';

const ProviderPatients = () => {
  const navigate = useNavigate();
  const user = useSelector(state => state.auth.user);
  const verificationStatus = user?.isVerified;
  const [actionLoading, setActionLoading] = useState({ id: null, action: null });

  const handleAddPatient = () => navigate('/provider/patients/add');
  const handleCreateConsultation = (patientId) =>
    navigate(`/provider/consultations/new?patientId=${patientId}`);

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
    <>
      <Link to={`/provider/patients/${patient.id}`} className={styles.viewDetailsButton}>
        Details
      </Link>
      <button
        className={styles.newConsultationButton}
        onClick={() => handleCreateConsultation(patient.id)}
      >
        New Consultation
      </button>
      {canRequestFullAccess(patient) && (
        <button
          className={styles.requestAccessButton}
          onClick={() => handleRequestFullAccess(patient, refresh)}
          disabled={actionLoading.id === patient.id}
        >
          {actionLoading.id === patient.id && actionLoading.action === 'requestFullAccess'
            ? 'Requesting...'
            : 'Request Full Access'}
        </button>
      )}
    </>
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
