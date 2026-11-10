'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import type { StatsWindow } from '@/hooks/use-stats-window';
import { getMyOperatorRanking } from '../api';
import { carrierKeys } from '../api/keys';

export function useOperatorRanking(window: StatsWindow) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: carrierKeys.operatorRanking(window),
    queryFn: () => getMyOperatorRanking(window, token),
    enabled,
    placeholderData: keepPreviousData,
  });
}
