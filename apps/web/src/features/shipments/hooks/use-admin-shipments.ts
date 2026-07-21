'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { listAdminShipments } from '../api';
import type { ListAdminShipmentsQuery } from '../types';

export function useAdminShipments(query: ListAdminShipmentsQuery) {
  const session = useSession();

  return useQuery({
    queryKey: ['shipments', 'admin', 'list', query],
    queryFn: () => listAdminShipments(query, session?.token ?? ''),
    enabled: Boolean(session),
    // Same bounded backstop as the carrier queue's own list (use-shipment-
    // queue.ts) — the WebSocket push (subscribe:monitoring) is the primary
    // signal, this just bounds the worst case if a message is missed.
    refetchInterval: 5000,
  });
}
