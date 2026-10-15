'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getSeller } from '../api';
import { sellerKeys } from '../api/keys';

export function useSeller(id: string) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: sellerKeys.detail(id),
    queryFn: () => getSeller(id, token),
    enabled,
  });
}
