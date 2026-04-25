import React from 'react';
import PropTypes from 'prop-types';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { formatDate } from '../../utils/dateUtils';

const row = (label, value) => (
  value === undefined || value === null || value === '' ? null : (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, padding: '6px 0' }} key={label}>
      <span style={{ color: '#6b7280', fontSize: 14 }}>{label}</span>
      <span style={{ fontSize: 14, color: '#111827' }}>{value}</span>
    </div>
  )
);

const renderFields = (recordType, r) => {
  if (recordType === 'immunizations') {
    return [
      row('Vaccine Name', r.vaccineName),
      row('Date Administered', r.dateAdministered ? formatDate(r.dateAdministered) : null),
      row('Serial Number', r.vaccineSerialNumber),
      row('Next Due Date', r.nextDueDate ? formatDate(r.nextDueDate) : null),
      row('Provider', r.provider)
    ];
  }
  if (recordType === 'hospital-records') {
    return [
      row('Admission Date', r.admissionDate ? formatDate(r.admissionDate) : null),
      row('Discharge Date', r.dischargeDate ? formatDate(r.dischargeDate) : 'In progress'),
      row('Reason', r.reasonForHospitalisation || r.reasonForHospitalization),
      row('Treatments', r.treatmentsReceived),
      row('Attending Doctors', r.attendingDoctors),
      row('Investigations', r.investigationsDone),
      row('Discharge Summary', r.dischargeSummary),
      row('Provider', r.provider)
    ];
  }
  if (recordType === 'surgery-records') {
    return [
      row('Surgery Type', r.typeOfSurgery),
      row('Surgery Date', r.dateOfSurgery ? formatDate(r.dateOfSurgery) : null),
      row('Reason', r.reason),
      row('Complications', r.complications),
      row('Recovery Notes', r.recoveryNotes),
      row('Provider', r.provider)
    ];
  }
  return null;
};

const titleMap = {
  'immunizations': 'Immunization Record',
  'hospital-records': 'Hospital Record',
  'surgery-records': 'Surgery Record'
};

const RecordDetailModal = ({ isOpen, onClose, record, recordType }) => {
  if (!record) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titleMap[recordType] || 'Record Details'}
      size="medium"
    >
      <div>{renderFields(recordType, record)}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
};

RecordDetailModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  record: PropTypes.object,
  recordType: PropTypes.oneOf(['immunizations', 'hospital-records', 'surgery-records']).isRequired
};

export default RecordDetailModal;
