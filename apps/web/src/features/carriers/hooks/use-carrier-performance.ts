'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import type { StatsWindow } from '@/hooks/use-stats-window';
import { getMyCarrierPerformance } from '../api';
import { carrierKeys } from '../api/keys';

export function useCarrierPerformance(window: StatsWindow) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: carrierKeys.performance(window),
    queryFn: () => getMyCarrierPerformance(window, token),
    enabled,
    placeholderData: keepPreviousData,
  });
}
