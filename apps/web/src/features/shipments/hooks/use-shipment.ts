'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useFallbackPollInterval } from '@/hooks/use-fallback-poll-interval';
import { getShipment } from '../api';

export function useShipment(id: string) {
  const { token, enabled } = useAuthToken();
  const fallbackPollInterval = useFallbackPollInterval();

  return useQuery({
    queryKey: ['shipments', 'detail', id],
    queryFn: () => getShipment(id, token),
    enabled,
    refetchInterval: fallbackPollInterval,
  });
}
