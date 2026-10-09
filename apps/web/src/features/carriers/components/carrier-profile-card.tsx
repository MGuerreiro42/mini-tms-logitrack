'use client';

import {
  type CompanyDetail,
  CompanyProfile,
} from '@/components/common/company-cards';
import { QueryState } from '@/components/common/query-state';
import { useMyCarrier } from '../hooks/use-my-carrier';
import type { Carrier } from '../types';

function carrierDetails(carrier: Carrier): CompanyDetail[] {
  return [
    { label: 'Manager email', value: carrier.email },
    { label: 'Tax ID', value: carrier.document, mono: true },
    { label: 'Users', value: String(carrier.userCount) },
    {
      label: 'Created',
      value: new Date(carrier.createdAt).toLocaleDateString(),
    },
  ];
}

export function CarrierProfileCard() {
  return (
    <QueryState
      query={useMyCarrier()}
      errorMessage="Couldn't load your company."
    >
      {(carrier) => (
        <CompanyProfile company={carrier} rows={carrierDetails(carrier)} />
      )}
    </QueryState>
  );
}
