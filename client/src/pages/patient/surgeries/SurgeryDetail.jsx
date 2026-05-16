import React from 'react';
import SurgeryDetailView from '../../provider/surgeries/SurgeryDetailView';

const PatientSurgeryDetail = () => (
  <SurgeryDetailView readOnly backLink="/patient/surgeries" />
);

export default PatientSurgeryDetail;
