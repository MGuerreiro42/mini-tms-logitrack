'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import type { StatsWindow } from '@/hooks/use-stats-window';
import { fallbackPollInterval, type LiveStatus } from '@/lib/live-status';
import { getQueueViewCounts, getShipmentViewCounts } from '../api';
import { shipmentKeys } from '../api/keys';

// liveStatus polls while that subscription isn't live; pages that refetch on their own events omit it.
export function useSellerViewCounts(
  statsWindow?: StatsWindow,
  liveStatus?: LiveStatus,
) {
  const { token, enabled } = useAuthToken();
  return useQuery({
    queryKey: shipmentKeys.viewCounts(statsWindow),
    queryFn: () => getShipmentViewCounts(token, statsWindow),
    enabled,
    refetchInterval: liveStatus && fallbackPollInterval(liveStatus),
  });
}

export function useQueueViewCounts(liveStatus?: LiveStatus) {
  const { token, enabled } = useAuthToken();
  return useQuery({
    queryKey: shipmentKeys.queueViewCounts(),
    queryFn: () => getQueueViewCounts(token),
    enabled,
    refetchInterval: liveStatus && fallbackPollInterval(liveStatus),
  });
}
