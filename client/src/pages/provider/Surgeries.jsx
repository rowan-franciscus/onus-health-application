import React from 'react';
import SurgeryTab from '../../components/forms/ConsultationForm/tabs/SurgeryTab';
import medicalRecordsService from '../../services/medicalRecords.service';
import StandaloneRecordPage from './StandaloneRecordPage';

const mapToPayload = (item) => ({
  typeOfSurgery: item.type,
  date: item.date,
  reason: item.reason,
  complications: item.complications || undefined,
  recoveryNotes: item.recoveryNotes || undefined
});

const ProviderSurgeries = () => (
  <StandaloneRecordPage
    title="Surgeries"
    subtitle="Record surgeries performed on your patients"
    addButtonLabel="Add New Surgery"
    modalTitle="Add Surgery"
    TabComponent={SurgeryTab}
    tabPropName="surgeryRecords"
    formikFieldName="surgery"
    mapToPayload={mapToPayload}
    createRecord={(patientId, payload) =>
      medicalRecordsService.createSurgery(patientId, payload)
    }
  />
);

export default ProviderSurgeries;
