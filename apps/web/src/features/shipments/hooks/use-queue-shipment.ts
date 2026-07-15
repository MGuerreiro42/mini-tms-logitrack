'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { getQueueShipment } from '../api';

export function useQueueShipment(id: string) {
  const session = useSession();

  return useQuery({
    queryKey: ['shipments', 'queue', 'detail', id],
    queryFn: () => getQueueShipment(id, session?.token ?? ''),
    enabled: Boolean(session),
    // Bounded correctness backstop alongside the WebSocket push
    // (useShipmentTracking) — see use-shipment.ts for why push alone isn't
    // treated as a guarantee.
    refetchInterval: 5000,
  });
}
