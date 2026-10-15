'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getShipmentStatusCounts } from '../api';
import { shipmentKeys } from '../api/keys';

export function statusCountsQuery(token: string, enabled: boolean) {
  return queryOptions({
    queryKey: shipmentKeys.statusCounts(),
    queryFn: () => getShipmentStatusCounts(token),
    enabled,
  });
}

export function useShipmentStatusCounts() {
  const { token, enabled } = useAuthToken();
  return useQuery(statusCountsQuery(token, enabled));
}
