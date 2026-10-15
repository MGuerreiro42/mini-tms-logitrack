'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { fallbackPollInterval, type LiveStatus } from '@/lib/live-status';
import { getQueueShipment } from '../api';
import { shipmentKeys } from '../api/keys';

export function useQueueShipment(id: string, liveStatus: LiveStatus) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: shipmentKeys.queueDetail(id),
    queryFn: () => getQueueShipment(id, token),
    enabled,
    refetchInterval: fallbackPollInterval(liveStatus),
  });
}
