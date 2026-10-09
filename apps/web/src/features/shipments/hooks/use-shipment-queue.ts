'use client';

import { useQuery } from '@tanstack/react-query';
import { useFallbackPollInterval } from '@/hooks/use-fallback-poll-interval';
import { useSession } from '@/hooks/use-session';
import { listQueue } from '../api';
import type { ListQueueQuery } from '../types';

export function useShipmentQueue(query: ListQueueQuery) {
  const session = useSession();
  const fallbackPollInterval = useFallbackPollInterval();

  return useQuery({
    queryKey: ['shipments', 'queue', 'list', query],
    queryFn: () => listQueue(query, session?.token ?? ''),
    enabled: Boolean(session),
    refetchInterval: fallbackPollInterval,
  });
}
