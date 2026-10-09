'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useFallbackPollInterval } from '@/hooks/use-fallback-poll-interval';
import { getQueueShipment } from '../api';
import { shipmentKeys } from '../api/keys';

export function useQueueShipment(id: string) {
  const { token, enabled } = useAuthToken();
  const fallbackPollInterval = useFallbackPollInterval();

  return useQuery({
    queryKey: shipmentKeys.queueDetail(id),
    queryFn: () => getQueueShipment(id, token),
    enabled,
    refetchInterval: fallbackPollInterval,
  });
}
