'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { listCarriers } from '../api';
import type { ListCarriersQuery } from '../types';

export function useCarriersList(query: ListCarriersQuery) {
  const session = useSession();

  return useQuery({
    queryKey: ['carriers', 'list', query],
    queryFn: () => listCarriers(query, session?.token ?? ''),
    enabled: Boolean(session),
  });
}
