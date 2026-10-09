'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { listSellers } from '../api';
import { sellerKeys } from '../api/keys';
import type { ListSellersQuery } from '../types';

export function useSellersList(query: ListSellersQuery) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: sellerKeys.list(query),
    queryFn: () => listSellers(query, token),
    enabled,
  });
}
