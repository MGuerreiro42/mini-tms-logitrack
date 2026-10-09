'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useFallbackPollInterval } from '@/hooks/use-fallback-poll-interval';
import { listAdminShipments } from '../api';
import { shipmentKeys } from '../api/keys';
import type { ListAdminShipmentsQuery } from '../types';

export function useAdminShipments(query: ListAdminShipmentsQuery) {
  const { token, enabled } = useAuthToken();
  const fallbackPollInterval = useFallbackPollInterval();

  return useQuery({
    queryKey: shipmentKeys.adminList(query),
    queryFn: () => listAdminShipments(query, token),
    enabled,
    refetchInterval: fallbackPollInterval,
  });
}
