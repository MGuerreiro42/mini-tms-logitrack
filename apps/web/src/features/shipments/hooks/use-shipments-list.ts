'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { listShipments } from '../api';
import type { ListShipmentsQuery } from '../types';

export function useShipmentsList(query: ListShipmentsQuery) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: ['shipments', 'list', query],
    queryFn: () => listShipments(query, token),
    enabled,
  });
}
