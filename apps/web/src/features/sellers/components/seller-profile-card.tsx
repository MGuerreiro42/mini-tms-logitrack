'use client';

import { CompanyProfile } from '@/components/common/company-cards';
import { QueryState } from '@/components/common/query-state';
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
          rows={sellerDetails(seller, (iso) =>
            new Date(iso).toLocaleDateString(),
          )}
        />
      )}
    </QueryState>
  );
}
