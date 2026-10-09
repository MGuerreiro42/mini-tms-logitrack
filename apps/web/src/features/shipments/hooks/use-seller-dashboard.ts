'use client';

import { useQueries } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { combineQueries } from '@/lib/combine-queries';
import { sumRecord } from '@/lib/sum-record';
import { getShipmentStatusCounts, getSlaSummary, listShipments } from '../api';
import { shipmentKeys } from '../api/keys';
import type { Shipment, ShipmentStatusCounts, SlaSummaryItem } from '../types';

const RECENT_SHIPMENTS_LIMIT = 5;

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
    other: total - byStatus.PENDING - byStatus.IN_TRANSIT - byStatus.DELIVERED,
    total,
  };
}

export function useSellerDashboard() {
  const { token, enabled } = useAuthToken();

  return useQueries({
    queries: [
      {
        queryKey: shipmentKeys.statusCounts(),
        queryFn: () => getShipmentStatusCounts(token),
        enabled,
      },
      {
        queryKey: shipmentKeys.dashboardRecent(),
        queryFn: () =>
          listShipments({ page: 1, limit: RECENT_SHIPMENTS_LIMIT }, token),
        enabled,
      },
      {
        queryKey: shipmentKeys.slaSummary(),
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
