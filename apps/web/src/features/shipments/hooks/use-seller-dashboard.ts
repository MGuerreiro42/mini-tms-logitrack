'use client';

import { useQueries } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { combineQueries } from '@/lib/combine-queries';
import { sumRecord } from '@/lib/sum-record';
import { getShipmentStatusCounts, getSlaSummary, listShipments } from '../api';
import type { Shipment, ShipmentStatusCounts, SlaSummaryItem } from '../types';

export interface SellerDashboardData {
  counts: ReturnType<typeof toCounts>;
  recentShipments: Shipment[];
  slaSummary: SlaSummaryItem[];
}

function toCounts(byStatus: ShipmentStatusCounts) {
  const total = sumRecord(byStatus);
  return {
    pending: byStatus.PENDING,
    inTransit: byStatus.IN_TRANSIT,
    delivered: byStatus.DELIVERED,
    // Statuses without a tile of their own, so the tiles always add up to Total.
    other: total - byStatus.PENDING - byStatus.IN_TRANSIT - byStatus.DELIVERED,
    total,
  };
}

export function useSellerDashboard() {
  const session = useSession();
  const token = session?.token ?? '';
  const enabled = Boolean(session);

  return useQueries({
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
      {
        queryKey: ['shipments', 'sla-summary'],
        queryFn: () => getSlaSummary(token),
        enabled,
      },
    ],
    combine: (results) =>
      combineQueries(
        results,
        ([counts, recent, slaSummary]): SellerDashboardData => ({
          counts: toCounts(counts),
          recentShipments: recent.data,
          slaSummary,
        }),
      ),
  });
}
