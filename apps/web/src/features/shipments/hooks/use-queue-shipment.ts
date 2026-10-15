'use client';

import { useQuery } from '@tanstack/react-query';
import { useFallbackPollInterval } from '@/hooks/use-fallback-poll-interval';
import { useSession } from '@/hooks/use-session';
import { getQueueShipment } from '../api';

export function useQueueShipment(id: string) {
  const session = useSession();
  const fallbackPollInterval = useFallbackPollInterval();

  return useQuery({
    queryKey: ['shipments', 'queue', 'detail', id],
    queryFn: () => getQueueShipment(id, session?.token ?? ''),
    enabled: Boolean(session),
    refetchInterval: fallbackPollInterval,
  });
}
