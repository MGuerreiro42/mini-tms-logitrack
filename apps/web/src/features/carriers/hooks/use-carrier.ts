'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getCarrier } from '../api';
import { carrierKeys } from '../api/keys';

export function useCarrier(id: string) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: carrierKeys.detail(id),
    queryFn: () => getCarrier(id, token),
    enabled,
  });
}
