'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getMyCarrier } from '../api';

export function useMyCarrier() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: ['carriers', 'me'],
    queryFn: () => getMyCarrier(token),
    enabled,
  });
}
