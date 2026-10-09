'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getMyOperatorRanking } from '../api';
import { carrierKeys } from '../api/keys';

export function useOperatorRanking() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: carrierKeys.operatorRanking(),
    queryFn: () => getMyOperatorRanking(token),
    enabled,
  });
}
