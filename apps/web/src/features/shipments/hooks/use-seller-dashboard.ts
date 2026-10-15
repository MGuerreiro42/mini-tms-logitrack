'use client';

import { useQueries } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { combineQueries } from '@/lib/combine-queries';
import { fallbackPollInterval } from '@/lib/live-status';
import { sumRecord } from '@/lib/sum-record';
import { getShipmentAttention, getSlaSummary, listShipments } from '../api';
import { shipmentKeys } from '../api/keys';
import type {
  Shipment,
  ShipmentAttention,
  ShipmentStatus,
  ShipmentStatusCounts,
  SlaSummaryItem,
} from '../types';
import { statusCountsQuery } from './use-shipment-status-counts';
import { useShipmentTracking } from './use-shipment-tracking';

const RECENT_SHIPMENTS_LIMIT = 6;

const IN_PROGRESS: ShipmentStatus[] = [
  'PENDING',
  'ACCEPTED',
  'COLLECTED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
];

export interface SellerDashboardData {
  counts: ReturnType<typeof toCounts>;
  onTime: ReturnType<typeof toOnTime>;
  attention: ShipmentAttention;
  recentShipments: Shipment[];
  slaSummary: SlaSummaryItem[];
}

function toCounts(byStatus: ShipmentStatusCounts) {
  return {
    inProgress: IN_PROGRESS.reduce((sum, status) => sum + byStatus[status], 0),
    pending: byStatus.PENDING,
    delivered: byStatus.DELIVERED,
    total: sumRecord(byStatus),
  };
}

function toOnTime(summary: SlaSummaryItem[]) {
  const delivered = summary.reduce((sum, row) => sum + row.deliveredCount, 0);
  const onTime = summary.reduce((sum, row) => sum + row.onTimeCount, 0);
  return {
    rate: delivered === 0 ? null : (onTime / delivered) * 100,
    late: delivered - onTime,
  };
}

export function useSellerDashboard() {
  const { token, enabled } = useAuthToken();
  const liveStatus = useShipmentTracking({ subscribeToSeller: true });
  const refetchInterval = fallbackPollInterval(liveStatus);

  const query = useQueries({
    queries: [
      { ...statusCountsQuery(token, enabled), refetchInterval },
      {
        queryKey: shipmentKeys.dashboardRecent(),
        queryFn: () =>
          listShipments({ page: 1, limit: RECENT_SHIPMENTS_LIMIT }, token),
        enabled,
        refetchInterval,
      },
      {
        queryKey: shipmentKeys.slaSummary(),
        queryFn: () => getSlaSummary(token),
        enabled,
        refetchInterval,
      },
      {
        queryKey: shipmentKeys.attention(),
        queryFn: () => getShipmentAttention(token),
        enabled,
        refetchInterval,
      },
    ],
    combine: (results) =>
      combineQueries(
        results,
        ([counts, recent, slaSummary, attention]): SellerDashboardData => ({
          counts: toCounts(counts),
          onTime: toOnTime(slaSummary),
          attention,
          recentShipments: recent.data,
          slaSummary,
        }),
      ),
  });

  return { query, liveStatus };
}
