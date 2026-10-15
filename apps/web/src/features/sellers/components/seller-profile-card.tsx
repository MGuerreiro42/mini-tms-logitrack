'use client';

import { QueryState } from '@/components/common/query-state';
import { CompanyProfile } from '@/features/companies/components/company-cards';
import { formatDate } from '@/lib/format-date';
import { useMySeller } from '../hooks/use-my-seller';
import { sellerDetails } from '../lib/seller-details';

export function SellerProfileCard() {
  return (
    <QueryState
      query={useMySeller()}
      errorMessage="Couldn't load your company."
    >
      {(seller) => (
        <CompanyProfile
          company={seller}
          rows={sellerDetails(seller, formatDate)}
        />
      )}
    </QueryState>
  );
}
