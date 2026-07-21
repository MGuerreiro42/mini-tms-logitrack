'use client';

import { useQueries } from '@tanstack/react-query';
import { getCarrierStatusCounts } from '@/features/carriers/api';
import { getSellerStatusCounts } from '@/features/sellers/api';
import { useSession } from '@/hooks/use-session';
import { sumRecord } from '@/lib/sum-record';

export function useAdminDashboard() {
  const session = useSession();
  const token = session?.token ?? '';
  const enabled = Boolean(session);

  const [sellers, carriers] = useQueries({
    queries: [
      {
        queryKey: ['sellers', 'status-counts'],
        queryFn: () => getSellerStatusCounts(token),
        enabled,
      },
      {
        queryKey: ['carriers', 'status-counts'],
        queryFn: () => getCarrierStatusCounts(token),
        enabled,
      },
    ],
  });

  const sellersTotal = sellers.data ? sumRecord(sellers.data) : 0;
  const carriersTotal = carriers.data ? sumRecord(carriers.data) : 0;

  return {
    // `isPending`, not `isLoading` — see use-seller-dashboard.ts's comment:
    // a query disabled because the session hasn't hydrated yet (SSR) reports
    // isLoading:false but isPending:true, which is the state that should
    // actually keep the loading indicator up.
    isLoading: [sellers, carriers].some((r) => r.isPending),
    isError: [sellers, carriers].some((r) => r.isError),
    counts: {
      sellersTotal,
      carriersTotal,
      sellersPending: sellers.data?.PENDING ?? 0,
      carriersPending: carriers.data?.PENDING ?? 0,
    },
  };
}
