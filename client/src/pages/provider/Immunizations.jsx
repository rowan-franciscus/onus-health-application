import React from 'react';
import ImmunizationTab from '../../components/forms/ConsultationForm/tabs/ImmunizationTab';
import medicalRecordsService from '../../services/medicalRecords.service';
import StandaloneRecordPage from './StandaloneRecordPage';

const mapToPayload = (item) => ({
  vaccineName: item.name,
  dateAdministered: item.date,
  vaccineSerialNumber: item.serialNumber || undefined,
  nextDueDate: item.nextDueDate || undefined,
  date: item.date
});

const ProviderImmunizations = () => (
  <StandaloneRecordPage
    title="Immunizations"
    subtitle="Record immunizations administered to your patients"
    addButtonLabel="Add New Immunization"
    modalTitle="Add Immunization"
    TabComponent={ImmunizationTab}
    tabPropName="immunizations"
    formikFieldName="immunization"
    mapToPayload={mapToPayload}
    createRecord={(patientId, payload) =>
      medicalRecordsService.createImmunization(patientId, payload)
    }
  />
);

export default ProviderImmunizations;
