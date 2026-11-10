'use client';

import { keepPreviousData, useQueries } from '@tanstack/react-query';
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
  SellerMetrics,
  ShipmentActivity,
  ShipmentAttention,
  ShipmentStatusCounts,
} from '../types';
import { statusCountsQuery } from './use-shipment-status-counts';
import { useShipmentTracking } from './use-shipment-tracking';

// The API maximum: grouped by shipment, it fills the six groups shown.
const ACTIVITY_LIMIT = 20;

export interface SellerDashboardData {
  counts: ShipmentStatusCounts;
  attention: ShipmentAttention;
  activity: ShipmentActivity[];
  metrics: SellerMetrics;
}

export function useSellerDashboard(statsWindow: StatsWindow) {
  const { token, enabled } = useAuthToken();
  const live = useShipmentTracking({ subscribeToSeller: true });
  const refetchInterval = fallbackPollInterval(live.status);

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
      {
        queryKey: shipmentKeys.metrics(statsWindow),
        queryFn: () => getSellerMetrics(statsWindow, token),
        enabled,
        refetchInterval,
        placeholderData: keepPreviousData,
      },
    ],
    combine: (results) => ({
      ...combineQueries(
        results,
        ([counts, activity, attention, metrics]): SellerDashboardData => ({
          counts,
          attention,
          activity,
          metrics,
        }),
      ),
      // The previous window stays on screen while the next one loads.
      isPlaceholderData: results[3].isPlaceholderData,
    }),
  });

  return { query, live };
}
