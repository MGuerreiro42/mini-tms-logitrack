'use client';

import { useQueries } from '@tanstack/react-query';
import { listCarriers } from '@/features/carriers/api';
import { listSellers } from '@/features/sellers/api';
import { useSession } from '@/hooks/use-session';

// Same "no aggregation endpoint" approach as the seller dashboard — every
// number here is `meta.total` off an existing admin-only list endpoint,
// `limit: 1` since `data` itself is never read. No shipments tile yet:
// admin has no shipments-read endpoint at all today (GET /shipments is
// seller-scoped) — that lands with the Global Monitoring slice, not here.
export function useAdminDashboard() {
  const session = useSession();
  const token = session?.token ?? '';
  const enabled = Boolean(session);

  const [sellersTotal, carriersTotal, sellersPending, carriersPending] =
    useQueries({
      queries: [
        {
          queryKey: ['admin-dashboard', 'sellers-total'],
          queryFn: () => listSellers({ page: 1, limit: 1 }, token),
          enabled,
        },
        {
          queryKey: ['admin-dashboard', 'carriers-total'],
          queryFn: () => listCarriers({ page: 1, limit: 1 }, token),
          enabled,
        },
        {
          queryKey: ['admin-dashboard', 'sellers-pending'],
          queryFn: () =>
            listSellers({ status: 'PENDING', page: 1, limit: 1 }, token),
          enabled,
        },
        {
          queryKey: ['admin-dashboard', 'carriers-pending'],
          queryFn: () =>
            listCarriers({ status: 'PENDING', page: 1, limit: 1 }, token),
          enabled,
        },
      ],
    });

  return {
    isLoading: enabled
      ? [sellersTotal, carriersTotal, sellersPending, carriersPending].some(
          (r) => r.isLoading,
        )
      : false,
    counts: {
      sellersTotal: sellersTotal.data?.meta.total ?? 0,
      carriersTotal: carriersTotal.data?.meta.total ?? 0,
      sellersPending: sellersPending.data?.meta.total ?? 0,
      carriersPending: carriersPending.data?.meta.total ?? 0,
    },
  };
}
