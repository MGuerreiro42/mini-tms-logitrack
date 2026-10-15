'use client';

import { useQuery } from '@tanstack/react-query';
import { useFallbackPollInterval } from '@/hooks/use-fallback-poll-interval';
import { useSession } from '@/hooks/use-session';
import { getShipment } from '../api';

export function useShipment(id: string) {
  const session = useSession();
  const fallbackPollInterval = useFallbackPollInterval();

  return useQuery({
    queryKey: ['shipments', 'detail', id],
    queryFn: () => getShipment(id, session?.token ?? ''),
    enabled: Boolean(session),
    refetchInterval: fallbackPollInterval,
  });
}
