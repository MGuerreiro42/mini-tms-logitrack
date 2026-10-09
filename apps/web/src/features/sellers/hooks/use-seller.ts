'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getSeller } from '../api';

export function useSeller(id: string) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: ['sellers', 'detail', id],
    queryFn: () => getSeller(id, token),
    enabled,
  });
}
