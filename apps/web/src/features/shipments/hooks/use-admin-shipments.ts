'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { fallbackPollInterval, type LiveStatus } from '@/lib/live-status';
import { listAdminShipments } from '../api';
import { shipmentKeys } from '../api/keys';
import type { ListAdminShipmentsQuery } from '../types';

export function useAdminShipments(
  query: ListAdminShipmentsQuery,
  liveStatus: LiveStatus,
) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: shipmentKeys.adminList(query),
    queryFn: () => listAdminShipments(query, token),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: fallbackPollInterval(liveStatus),
  });
}
