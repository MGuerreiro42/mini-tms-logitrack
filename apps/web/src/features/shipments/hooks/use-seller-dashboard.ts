'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { combineQueries } from '@/lib/combine-queries';
import { fetchAllPages } from '@/lib/fetch-all-pages';
import { fallbackPollInterval } from '@/lib/live-status';
import { sumRecord } from '@/lib/sum-record';
import { getShipmentStatusCounts, getSlaSummary, listShipments } from '../api';
import { shipmentKeys } from '../api/keys';
import type {
  Shipment,
  ShipmentStatus,
  ShipmentStatusCounts,
  SlaSummaryItem,
} from '../types';
import { useShipmentTracking } from './use-shipment-tracking';

const RECENT_SHIPMENTS_LIMIT = 6;

const IN_PROGRESS: ShipmentStatus[] = [
  'PENDING',
  'ACCEPTED',
  'COLLECTED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
];
// Every status that can still change; the list endpoint filters by one status at a time.
const OPEN: ShipmentStatus[] = [...IN_PROGRESS, 'FAILED_DELIVERY'];

export interface SellerDashboardData {
  counts: ReturnType<typeof toCounts>;
  onTime: ReturnType<typeof toOnTime>;
  openShipments: Shipment[];
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

async function listOpenShipments(token: string): Promise<Shipment[]> {
  const pages = await Promise.all(
    OPEN.map((status) =>
      fetchAllPages((page) => listShipments({ ...page, status }, token)),
    ),
  );
  return pages.flat();
}

const toIds = (shipments: Shipment[]) => shipments.map(({ id }) => id);

export function useSellerDashboard() {
  const { token, enabled } = useAuthToken();
  const open = {
    queryKey: shipmentKeys.open(),
    queryFn: () => listOpenShipments(token),
    enabled,
  };

  const openIds = useQuery({ ...open, select: toIds });
  const liveStatus = useShipmentTracking({ shipmentIds: openIds.data });
  const refetchInterval = fallbackPollInterval(liveStatus);

  const query = useQueries({
    queries: [
      {
        queryKey: shipmentKeys.statusCounts(),
        queryFn: () => getShipmentStatusCounts(token),
        enabled,
        refetchInterval,
      },
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
      { ...open, refetchInterval },
    ],
    combine: (results) =>
      combineQueries(
        results,
        ([counts, recent, slaSummary, openShipments]): SellerDashboardData => ({
          counts: toCounts(counts),
          onTime: toOnTime(slaSummary),
          openShipments,
          recentShipments: recent.data,
          slaSummary,
        }),
      ),
  });

  return { query, liveStatus };
}
