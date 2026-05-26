import React, { useCallback } from 'react';
import PracticeAdminService from '../../services/practiceAdmin.service';
import BillingTable from './BillingTable';

const PracticeAdminBilling = () => {
  const fetch = useCallback(() => PracticeAdminService.getBilling(), []);
  const update = useCallback((id, status) => PracticeAdminService.updateBillingStatus(id, status), []);
  return (
    <BillingTable
      title="Billing Support"
      subtitle="Operational view of consultations for billing and insurance submissions. No payment processing."
      fetchBilling={fetch}
      updateStatus={update}
      csvUrl={PracticeAdminService.exportBillingCsvUrl}
      exportTitle="Onus Health — Billing Support Export"
    />
  );
};

export default PracticeAdminBilling;
