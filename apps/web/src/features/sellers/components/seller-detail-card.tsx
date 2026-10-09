'use client';

import { CompanyReview } from '@/components/common/company-cards';
import { QueryState } from '@/components/common/query-state';
import {
  useApproveSeller,
  useRejectSeller,
} from '../hooks/use-approve-reject-seller';
import { useSeller } from '../hooks/use-seller';
import { sellerDetails } from '../lib/seller-details';

export function SellerDetailCard({ id }: { id: string }) {
  const query = useSeller(id);
  const approve = useApproveSeller(id);
  const reject = useRejectSeller(id);

  return (
    <QueryState
      query={query}
      errorMessage="Couldn't load this seller."
      notFoundMessage="Seller not found."
    >
      {(seller) => (
        <CompanyReview
          company={seller}
          rows={sellerDetails(seller, (iso) => new Date(iso).toLocaleString())}
          approve={approve}
          reject={reject}
        />
      )}
    </QueryState>
  );
}
