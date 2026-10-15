'use client';

import { CompanyReview } from '@/components/common/company-cards';
import { QueryState } from '@/components/common/query-state';
import {
  useApproveCarrier,
  useRejectCarrier,
} from '../hooks/use-approve-reject-carrier';
import { useCarrier } from '../hooks/use-carrier';
import { carrierDetails } from '../lib/carrier-details';

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
          rows={carrierDetails(carrier, (iso) =>
            new Date(iso).toLocaleString(),
          )}
          approve={approve}
          reject={reject}
        />
      )}
    </QueryState>
  );
}
