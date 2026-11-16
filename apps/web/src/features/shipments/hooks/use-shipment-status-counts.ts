'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import type { StatsWindow } from '@/hooks/use-stats-window';
import { getShipmentStatusCounts } from '../api';
import { shipmentKeys } from '../api/keys';

export function statusCountsQuery(
  token: string,
  enabled: boolean,
  statsWindow?: StatsWindow,
) {
  return queryOptions({
    queryKey: shipmentKeys.statusCounts(statsWindow),
    queryFn: () => getShipmentStatusCounts(token, statsWindow),
    enabled,
  });
}

export function useShipmentStatusCounts(statsWindow?: StatsWindow) {
  const { token, enabled } = useAuthToken();
  return useQuery(statusCountsQuery(token, enabled, statsWindow));
}
