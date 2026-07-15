'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { listShipments } from '../api';
import type { ListShipmentsQuery } from '../types';

export function useShipmentsList(query: ListShipmentsQuery) {
  const session = useSession();

  return useQuery({
    queryKey: ['shipments', 'list', query],
    queryFn: () => listShipments(query, session?.token ?? ''),
    enabled: Boolean(session),
  });
}
