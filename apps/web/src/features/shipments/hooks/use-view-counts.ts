'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import type { StatsWindow } from '@/hooks/use-stats-window';
import { getQueueViewCounts, getShipmentViewCounts } from '../api';
import { shipmentKeys } from '../api/keys';

export function useSellerViewCounts(statsWindow?: StatsWindow) {
  const { token, enabled } = useAuthToken();
  return useQuery({
    queryKey: shipmentKeys.viewCounts(statsWindow),
    queryFn: () => getShipmentViewCounts(token, statsWindow),
    enabled,
  });
}

export function useQueueViewCounts() {
  const { token, enabled } = useAuthToken();
  return useQuery({
    queryKey: shipmentKeys.queueViewCounts(),
    queryFn: () => getQueueViewCounts(token),
    enabled,
  });
}
