'use client';

import { CompanyProfile } from '@/components/common/company-cards';
import { QueryState } from '@/components/common/query-state';
import { formatDate } from '@/lib/format-date';
import { useMyCarrier } from '../hooks/use-my-carrier';
import { carrierDetails } from '../lib/carrier-details';

export function CarrierProfileCard() {
  return (
    <QueryState
      query={useMyCarrier()}
      errorMessage="Couldn't load your company."
    >
      {(carrier) => (
        <CompanyProfile
          company={carrier}
          rows={carrierDetails(carrier, formatDate)}
        />
      )}
    </QueryState>
  );
}
