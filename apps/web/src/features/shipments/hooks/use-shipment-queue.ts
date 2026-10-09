'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useFallbackPollInterval } from '@/hooks/use-fallback-poll-interval';
import { listQueue } from '../api';
import { shipmentKeys } from '../api/keys';
import type { ListQueueQuery } from '../types';

export function useShipmentQueue(query: ListQueueQuery) {
  const { token, enabled } = useAuthToken();
  const fallbackPollInterval = useFallbackPollInterval();

  return useQuery({
    queryKey: shipmentKeys.queueList(query),
    queryFn: () => listQueue(query, token),
    enabled,
    refetchInterval: fallbackPollInterval,
  });
}
