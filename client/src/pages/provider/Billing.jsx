import React, { useCallback } from 'react';
import ProviderService from '../../services/provider.service';
import BillingTable from '../practiceAdmin/BillingTable';

const ProviderBilling = () => {
  const fetch = useCallback(() => ProviderService.getBilling(), []);
  const update = useCallback((id, status) => ProviderService.updateBillingStatus(id, status), []);
  return (
    <BillingTable
      title="Billing Support"
      subtitle="Operational view of consultations for billing and insurance submissions. No payment processing."
      fetchBilling={fetch}
      updateStatus={update}
      csvUrl={ProviderService.exportBillingCsvUrl}
      exportTitle="Onus Health — Billing Support Export"
    />
  );
};

export default ProviderBilling;
