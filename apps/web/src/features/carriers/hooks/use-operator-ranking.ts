'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getMyOperatorRanking } from '../api';

export function useOperatorRanking() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: ['carriers', 'me', 'operator-ranking'],
    queryFn: () => getMyOperatorRanking(token),
    enabled,
  });
}
