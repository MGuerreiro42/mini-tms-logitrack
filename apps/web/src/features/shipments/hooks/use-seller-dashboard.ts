'use client';

import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import type { StatsWindow } from '@/hooks/use-stats-window';
import type { fallbackPollInterval } from '@/lib/live-status';
import {
  getSellerMetrics,
  getShipmentActivity,
  getShipmentAttention,
  listShipments,
} from '../api';
import { shipmentKeys } from '../api/keys';
import { statusCountsQuery } from './use-shipment-status-counts';

// The page subscribes once (useShipmentTracking); each section reads its own query and polls
// with this while the socket is down.
export type OverviewPoll = ReturnType<typeof fallbackPollInterval>;

// Recent updates read one query: every event of the last 4 h for the strip (the API
// allows 200), the newest of them for the feed.
export const ACTIVITY_WINDOW_MS = 4 * 3_600_000;
const ACTIVITY_LIMIT = 200;
// The list API's page maximum: the flow draws the first 100 open shipments by due time.
const FLOW_QUERY = { view: 'active', limit: 100 } as const;

export function useSellerCounts(poll: OverviewPoll) {
  const { token, enabled } = useAuthToken();
  return useQuery({
    ...statusCountsQuery(token, enabled),
    refetchInterval: poll,
  });
}

export function useSellerAttention(poll: OverviewPoll) {
  const { token, enabled } = useAuthToken();
  return useQuery({
    queryKey: shipmentKeys.attention(),
    queryFn: () => getShipmentAttention(token),
    enabled,
    refetchInterval: poll,
  });
}

export function useSellerActivity(poll: OverviewPoll) {
  const { token, enabled } = useAuthToken();
  return useQuery({
    queryKey: shipmentKeys.activity(),
    queryFn: () =>
      getShipmentActivity(
        {
          since: new Date(Date.now() - ACTIVITY_WINDOW_MS).toISOString(),
          limit: ACTIVITY_LIMIT,
        },
        token,
      ),
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

export function useSellerFlow(poll: OverviewPoll) {
  const { token, enabled } = useAuthToken();
  return useQuery({
    queryKey: shipmentKeys.list(FLOW_QUERY),
    queryFn: () => listShipments(FLOW_QUERY, token),
    enabled,
    refetchInterval: poll,
  });
}

const SLA_VIEWS = ['on-track', 'due-soon', 'late'] as const;

// Exact per-state totals of the open set, from the lists the legend links open (a page of one is enough).
export function useSellerSlaTotals(poll: OverviewPoll) {
  const { token, enabled } = useAuthToken();
  return useQueries({
    queries: SLA_VIEWS.map((view) => {
      const query = { view, limit: 1 } as const;
      return {
        queryKey: shipmentKeys.list(query),
        queryFn: () => listShipments(query, token),
        enabled,
        refetchInterval: poll,
      };
    }),
    combine: (results) => {
      const [onTrack, dueSoon, late] = results.map(
        ({ data }) => data?.meta.total,
      );
      return onTrack === undefined ||
        dueSoon === undefined ||
        late === undefined
        ? undefined
        : { onTrack, dueSoon, late };
    },
  });
}
