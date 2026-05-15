import React from 'react';
import AdmissionDetailView from '../../provider/hospital-admissions/AdmissionDetailView';

const PatientAdmissionDetail = () => (
  <AdmissionDetailView readOnly backLink="/patient/hospital-admissions" />
);

export default PatientAdmissionDetail;
