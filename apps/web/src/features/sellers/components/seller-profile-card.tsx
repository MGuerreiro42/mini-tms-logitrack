'use client';

import {
  type CompanyDetail,
  CompanyProfile,
} from '@/components/common/company-cards';
import { QueryState } from '@/components/common/query-state';
import { useMySeller } from '../hooks/use-my-seller';
import type { Seller } from '../types';

function sellerDetails(seller: Seller): CompanyDetail[] {
  return [
    { label: 'Email', value: seller.email },
    { label: 'Tax ID', value: seller.document, mono: true },
    {
      label: 'Created',
      value: new Date(seller.createdAt).toLocaleDateString(),
    },
  ];
}

export function SellerProfileCard() {
  return (
    <QueryState
      query={useMySeller()}
      errorMessage="Couldn't load your company."
    >
      {(seller) => (
        <CompanyProfile company={seller} rows={sellerDetails(seller)} />
      )}
    </QueryState>
  );
}
