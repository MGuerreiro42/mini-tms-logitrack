'use client';

import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import type { StatsWindow } from '@/hooks/use-stats-window';
import { combineQueries } from '@/lib/combine-queries';
import { fallbackPollInterval } from '@/lib/live-status';
import {
  getSellerMetrics,
  getShipmentActivity,
  getShipmentAttention,
} from '../api';
import { shipmentKeys } from '../api/keys';
import type {
  ShipmentActivity,
  ShipmentAttention,
  ShipmentStatusCounts,
} from '../types';
import { statusCountsQuery } from './use-shipment-status-counts';
import { useShipmentTracking } from './use-shipment-tracking';

const ACTIVITY_LIMIT = 8;

export interface SellerDashboardData {
  counts: ShipmentStatusCounts;
  attention: ShipmentAttention;
  activity: ShipmentActivity[];
}

export function useSellerDashboard(statsWindow: StatsWindow) {
  const { token, enabled } = useAuthToken();
  const live = useShipmentTracking({ subscribeToSeller: true });
  const refetchInterval = fallbackPollInterval(live.status);

  // The "now" numbers and the window's metrics load and fail apart.
  const query = useQueries({
    queries: [
      { ...statusCountsQuery(token, enabled), refetchInterval },
      {
        queryKey: shipmentKeys.activity(),
        queryFn: () => getShipmentActivity(ACTIVITY_LIMIT, token),
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
        ([counts, activity, attention]): SellerDashboardData => ({
          counts,
          attention,
          activity,
        }),
      ),
  });
  const metrics = useQuery({
    queryKey: shipmentKeys.metrics(statsWindow),
    queryFn: () => getSellerMetrics(statsWindow, token),
    enabled,
    refetchInterval,
    placeholderData: keepPreviousData,
  });

  return { query, metrics, live };
}
