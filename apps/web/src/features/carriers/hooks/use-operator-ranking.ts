'use client';

import { useLiveQuery } from '@/hooks/use-live-query';
import type { StatsWindow } from '@/hooks/use-stats-window';
import type { LiveStatus } from '@/lib/live-status';
import { getOperatorRanking } from '../api';
import { carrierKeys } from '../api/keys';

// Polls while the queue room is not live, like every other live page.
export function useOperatorRanking(
  statsWindow: StatsWindow,
  liveStatus: LiveStatus,
  carrierId?: string,
) {
  return useLiveQuery({
    queryKey: carrierKeys.operatorRanking(statsWindow, carrierId),
    queryFn: (token) => getOperatorRanking(statsWindow, token, carrierId),
    liveStatus,
    keepPrevious: true,
  });
}
