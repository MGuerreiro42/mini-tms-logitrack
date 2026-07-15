'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { listQueue } from '../api';
import type { ListQueueQuery } from '../types';

export function useShipmentQueue(query: ListQueueQuery) {
  const session = useSession();

  return useQuery({
    queryKey: ['shipments', 'queue', 'list', query],
    queryFn: () => listQueue(query, session?.token ?? ''),
    enabled: Boolean(session),
    // Bounded correctness backstop alongside the WebSocket push
    // (useShipmentTracking) — see use-shipment.ts for why push alone isn't
    // treated as a guarantee.
    refetchInterval: 5000,
  });
}
