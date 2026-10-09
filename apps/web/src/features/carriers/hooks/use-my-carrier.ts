'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getMyCarrier } from '../api';
import { carrierKeys } from '../api/keys';

export function useMyCarrier() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: carrierKeys.me(),
    queryFn: () => getMyCarrier(token),
    enabled,
  });
}
