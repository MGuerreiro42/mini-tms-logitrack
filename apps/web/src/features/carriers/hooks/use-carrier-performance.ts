'use client';

import { useLiveQuery } from '@/hooks/use-live-query';
import type { StatsWindow } from '@/hooks/use-stats-window';
import type { LiveStatus } from '@/lib/live-status';
import { getCarrierPerformance } from '../api';
import { carrierKeys } from '../api/keys';

// Polls while the queue room is not live, like every other live page.
export function useCarrierPerformance(
  statsWindow: StatsWindow,
  liveStatus: LiveStatus,
  carrierId?: string,
) {
  return useLiveQuery({
    queryKey: carrierKeys.performance(statsWindow, carrierId),
    queryFn: (token) => getCarrierPerformance(statsWindow, token, carrierId),
    liveStatus,
    keepPrevious: true,
  });
}
