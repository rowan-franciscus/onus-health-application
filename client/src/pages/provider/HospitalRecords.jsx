import React from 'react';
import HospitalTab from '../../components/forms/ConsultationForm/tabs/HospitalTab';
import medicalRecordsService from '../../services/medicalRecords.service';
import StandaloneRecordPage from './StandaloneRecordPage';

const splitToArray = (value) =>
  value
    ? value.split(',').map(s => s.trim()).filter(Boolean)
    : [];

const mapToPayload = (item) => ({
  hospitalName: item.hospitalName,
  admissionDate: item.admissionDate,
  dischargeDate: item.dischargeDate || undefined,
  reasonForHospitalization: item.reason,
  treatmentsReceived: splitToArray(item.treatments),
  attendingDoctors: splitToArray(item.attendingDoctors).map(name => ({ name })),
  dischargeSummary: item.dischargeSummary || undefined,
  investigationsDone: splitToArray(item.investigations),
  date: item.admissionDate
});

const ProviderHospitalRecords = () => (
  <StandaloneRecordPage
    title="Hospital Records"
    subtitle="Record hospital stays for your patients"
    addButtonLabel="Add New Hospital Record"
    modalTitle="Add Hospital Record"
    TabComponent={HospitalTab}
    tabPropName="hospitalRecords"
    formikFieldName="hospital"
    mapToPayload={mapToPayload}
    createRecord={(patientId, payload) =>
      medicalRecordsService.createHospitalRecord(patientId, payload)
    }
  />
);

export default ProviderHospitalRecords;
