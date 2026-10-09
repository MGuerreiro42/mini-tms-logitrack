'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useFallbackPollInterval } from '@/hooks/use-fallback-poll-interval';
import { getQueueShipment } from '../api';

export function useQueueShipment(id: string) {
  const { token, enabled } = useAuthToken();
  const fallbackPollInterval = useFallbackPollInterval();

  return useQuery({
    queryKey: ['shipments', 'queue', 'detail', id],
    queryFn: () => getQueueShipment(id, token),
    enabled,
    refetchInterval: fallbackPollInterval,
  });
}
