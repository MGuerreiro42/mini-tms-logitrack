'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { fallbackPollInterval, type LiveStatus } from '@/lib/live-status';
import { getShipment } from '../api';
import { shipmentKeys } from '../api/keys';

export function useShipment(id: string, liveStatus: LiveStatus) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: shipmentKeys.detail(id),
    queryFn: () => getShipment(id, token),
    enabled,
    refetchInterval: fallbackPollInterval(liveStatus),
  });
}
