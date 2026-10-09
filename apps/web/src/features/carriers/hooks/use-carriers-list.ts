'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { listCarriers } from '../api';
import type { ListCarriersQuery } from '../types';

export function useCarriersList(query: ListCarriersQuery) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: ['carriers', 'list', query],
    queryFn: () => listCarriers(query, token),
    enabled,
  });
}
