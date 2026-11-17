'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import type { StatsWindow } from '@/hooks/use-stats-window';
import type { fallbackPollInterval } from '@/lib/live-status';
import {
  getSellerMetrics,
  getShipmentActivity,
  getShipmentAttention,
} from '../api';
import { shipmentKeys } from '../api/keys';
import { statusCountsQuery } from './use-shipment-status-counts';

// The page subscribes once (useShipmentTracking); each section reads its own query and polls
// with this while the socket is down.
export type OverviewPoll = ReturnType<typeof fallbackPollInterval>;

// The API maximum: grouped by shipment, it fills the six groups shown.
const ACTIVITY_LIMIT = 20;

export function useSellerCounts(poll: OverviewPoll) {
  const { token, enabled } = useAuthToken();
  return useQuery({
    ...statusCountsQuery(token, enabled),
    refetchInterval: poll,
    // The next poll is the retry, so a failure shows at once.
    retry: false,
  });
}

export function useSellerAttention(poll: OverviewPoll) {
  const { token, enabled } = useAuthToken();
  return useQuery({
    queryKey: shipmentKeys.attention(),
    queryFn: () => getShipmentAttention(token),
    enabled,
    refetchInterval: poll,
    // The next poll is the retry, so a failure shows at once.
    retry: false,
  });
}

export function useSellerActivity(poll: OverviewPoll) {
  const { token, enabled } = useAuthToken();
  return useQuery({
    queryKey: shipmentKeys.activity(),
    queryFn: () => getShipmentActivity(ACTIVITY_LIMIT, token),
    enabled,
    refetchInterval: poll,
  });
}

export function useSellerMetrics(statsWindow: StatsWindow, poll: OverviewPoll) {
  const { token, enabled } = useAuthToken();
  return useQuery({
    queryKey: shipmentKeys.metrics(statsWindow),
    queryFn: () => getSellerMetrics(statsWindow, token),
    enabled,
    refetchInterval: poll,
    // The previous window's numbers stay, dimmed, until the new ones arrive.
    placeholderData: keepPreviousData,
  });
}
