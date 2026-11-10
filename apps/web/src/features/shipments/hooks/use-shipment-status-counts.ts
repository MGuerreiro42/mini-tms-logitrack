'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import type { StatsWindow } from '@/hooks/use-stats-window';
import { getShipmentStatusCounts } from '../api';
import { shipmentKeys } from '../api/keys';

export function statusCountsQuery(
  token: string,
  enabled: boolean,
  window?: StatsWindow,
) {
  return queryOptions({
    queryKey: shipmentKeys.statusCounts(window),
    queryFn: () => getShipmentStatusCounts(token, window),
    enabled,
  });
}

export function useShipmentStatusCounts(window?: StatsWindow) {
  const { token, enabled } = useAuthToken();
  return useQuery(statusCountsQuery(token, enabled, window));
}
