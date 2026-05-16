import React from 'react';
import SurgeryDetailView from './SurgeryDetailView';

const SurgeryDetail = () => (
  <SurgeryDetailView readOnly={false} backLink="/provider/surgeries" />
);

export default SurgeryDetail;
