'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getMyCarrierPerformance } from '../api';

export function useCarrierPerformance() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: ['carriers', 'me', 'performance'],
    queryFn: () => getMyCarrierPerformance(token),
    enabled,
  });
}
