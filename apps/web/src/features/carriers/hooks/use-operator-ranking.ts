'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import type { StatsWindow } from '@/hooks/use-stats-window';
import { getMyOperatorRanking } from '../api';
import { carrierKeys } from '../api/keys';

export function useOperatorRanking(statsWindow: StatsWindow) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: carrierKeys.operatorRanking(statsWindow),
    queryFn: () => getMyOperatorRanking(statsWindow, token),
    enabled,
    placeholderData: keepPreviousData,
  });
}
