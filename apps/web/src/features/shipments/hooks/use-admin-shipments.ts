'use client';

import { useQuery } from '@tanstack/react-query';
import { useFallbackPollInterval } from '@/hooks/use-fallback-poll-interval';
import { useSession } from '@/hooks/use-session';
import { listAdminShipments } from '../api';
import type { ListAdminShipmentsQuery } from '../types';

export function useAdminShipments(query: ListAdminShipmentsQuery) {
  const session = useSession();
  const fallbackPollInterval = useFallbackPollInterval();

  return useQuery({
    queryKey: ['shipments', 'admin', 'list', query],
    queryFn: () => listAdminShipments(query, session?.token ?? ''),
    enabled: Boolean(session),
    refetchInterval: fallbackPollInterval,
  });
}
