'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getMyCarrierPerformance } from '../api';
import { carrierKeys } from '../api/keys';

export function useCarrierPerformance() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: carrierKeys.performance(),
    queryFn: () => getMyCarrierPerformance(token),
    enabled,
  });
}
