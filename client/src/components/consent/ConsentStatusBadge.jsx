import React from 'react';
import Badge from '../common/Badge/Badge';
import { CONSENT_STATUS } from '../../services/consent.service';

const ConsentStatusBadge = ({ status, className }) => {
  const meta = CONSENT_STATUS[status];
  if (!meta) return null;
  return <Badge variant={meta.variant} className={className}>{meta.label}</Badge>;
};

export default ConsentStatusBadge;
