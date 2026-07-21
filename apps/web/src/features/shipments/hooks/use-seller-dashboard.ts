'use client';

import { useQueries } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { sumRecord } from '@/lib/sum-record';
import { getShipmentStatusCounts, listShipments } from '../api';

export function useSellerDashboard() {
  const session = useSession();
  const token = session?.token ?? '';
  const enabled = Boolean(session);

  const [counts, recent] = useQueries({
    queries: [
      {
        queryKey: ['shipments', 'status-counts'],
        queryFn: () => getShipmentStatusCounts(token),
        enabled,
      },
      {
        queryKey: ['shipments', 'dashboard-recent'],
        queryFn: () => listShipments({ page: 1, limit: 5 }, token),
        enabled,
      },
    ],
  });

  const total = counts.data ? sumRecord(counts.data) : 0;
  // Everything that isn't one of the 3 tiles shown up front — surfaced as
  // its own number rather than silently missing, so the tiles always add up
  // to Total instead of leaving an unexplained gap (a real bug found in
  // code review: ACCEPTED/COLLECTED/OUT_FOR_DELIVERY/FAILED_DELIVERY/
  // CANCELLED/RETURNED used to count toward Total with no tile of their own).
  const other = counts.data
    ? total -
      counts.data.PENDING -
      counts.data.IN_TRANSIT -
      counts.data.DELIVERED
    : 0;

  return {
    // `isPending`, not `isLoading` — a query disabled because the session
    // hasn't hydrated yet (true during SSR, since useSession() reads
    // document.cookie and document doesn't exist server-side) reports
    // isLoading:false but isPending:true. Using isLoading here previously
    // meant the server-rendered HTML (and the first client paint before
    // hydration catches up) showed the "no shipments yet" empty state
    // instead of a loading indicator, even for a seller with real shipments.
    isLoading: [counts, recent].some((r) => r.isPending),
    isError: [counts, recent].some((r) => r.isError),
    counts: {
      pending: counts.data?.PENDING ?? 0,
      inTransit: counts.data?.IN_TRANSIT ?? 0,
      delivered: counts.data?.DELIVERED ?? 0,
      other,
      total,
    },
    recentShipments: recent.data?.data ?? [],
  };
}
