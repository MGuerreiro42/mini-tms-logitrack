'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getMySeller } from '../api';
import { sellerKeys } from '../api/keys';

export function useMySeller() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: sellerKeys.me(),
    queryFn: () => getMySeller(token),
    enabled,
  });
}
