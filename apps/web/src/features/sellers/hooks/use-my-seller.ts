'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getMySeller } from '../api';

export function useMySeller() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: ['sellers', 'me'],
    queryFn: () => getMySeller(token),
    enabled,
  });
}
