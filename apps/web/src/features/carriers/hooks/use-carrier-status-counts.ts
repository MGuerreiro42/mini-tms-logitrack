'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getCarrierStatusCounts } from '../api';
import { carrierKeys } from '../api/keys';

export function useCarrierStatusCounts() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: carrierKeys.statusCounts(),
    queryFn: () => getCarrierStatusCounts(token),
    enabled,
  });
}
