'use client';

import { useQueries } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { listShipments } from '../api';
import type { ShipmentStatus } from '../types';

// No dedicated aggregation endpoint — the dashboard mock itself notes
// `GET /shipments (agregado no client)`. `limit: 1` on the per-status calls
// means only `meta.total` is read from them, never `data`; the unfiltered
// call doubles as both "recent shipments" (its `data`) and the grand total
// (its `meta.total`), so this is 4 requests, not 5.
const DASHBOARD_STATUSES: ShipmentStatus[] = [
  'PENDING',
  'IN_TRANSIT',
  'DELIVERED',
];

export function useSellerDashboard() {
  const session = useSession();
  const token = session?.token ?? '';
  const enabled = Boolean(session);

  const [pending, inTransit, delivered, recent] = useQueries({
    queries: [
      ...DASHBOARD_STATUSES.map((status) => ({
        queryKey: ['shipments', 'dashboard-count', status],
        queryFn: () => listShipments({ status, page: 1, limit: 1 }, token),
        enabled,
      })),
      {
        queryKey: ['shipments', 'dashboard-recent'],
        queryFn: () => listShipments({ page: 1, limit: 5 }, token),
        enabled,
      },
    ],
  });

  return {
    isLoading: enabled
      ? [pending, inTransit, delivered, recent].some((r) => r.isLoading)
      : false,
    counts: {
      pending: pending.data?.meta.total ?? 0,
      inTransit: inTransit.data?.meta.total ?? 0,
      delivered: delivered.data?.meta.total ?? 0,
      total: recent.data?.meta.total ?? 0,
    },
    recentShipments: recent.data?.data ?? [],
  };
}
