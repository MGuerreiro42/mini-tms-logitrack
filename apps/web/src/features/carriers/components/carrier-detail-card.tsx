'use client';

import {
  type CompanyDetail,
  CompanyReview,
} from '@/components/common/company-cards';
import { QueryState } from '@/components/common/query-state';
import {
  useApproveCarrier,
  useRejectCarrier,
} from '../hooks/use-approve-reject-carrier';
import { useCarrier } from '../hooks/use-carrier';
import type { Carrier } from '../types';

function carrierDetails(carrier: Carrier): CompanyDetail[] {
  return [
    { label: 'Manager email', value: carrier.email },
    { label: 'Tax ID', value: carrier.document, mono: true },
    { label: 'Users', value: String(carrier.userCount) },
    { label: 'Created', value: new Date(carrier.createdAt).toLocaleString() },
  ];
}

export function CarrierDetailCard({ id }: { id: string }) {
  const query = useCarrier(id);
  const approve = useApproveCarrier(id);
  const reject = useRejectCarrier(id);

  return (
    <QueryState
      query={query}
      errorMessage="Couldn't load this carrier."
      notFoundMessage="Carrier not found."
    >
      {(carrier) => (
        <CompanyReview
          company={carrier}
          rows={carrierDetails(carrier)}
          approve={approve}
          reject={reject}
        />
      )}
    </QueryState>
  );
}
