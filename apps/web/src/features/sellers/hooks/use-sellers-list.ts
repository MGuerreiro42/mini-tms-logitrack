'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { listSellers } from '../api';
import type { ListSellersQuery } from '../types';

export function useSellersList(query: ListSellersQuery) {
  const session = useSession();

  return useQuery({
    queryKey: ['sellers', 'list', query],
    queryFn: () => listSellers(query, session?.token ?? ''),
    enabled: Boolean(session),
  });
}
