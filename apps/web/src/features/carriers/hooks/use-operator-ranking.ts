'use client';

import { useLiveQuery } from '@/hooks/use-live-query';
import type { StatsWindow } from '@/hooks/use-stats-window';
import type { LiveStatus } from '@/lib/live-status';
import { getMyOperatorRanking } from '../api';
import { carrierKeys } from '../api/keys';

// Polls while the queue room is not live, like every other live page.
export function useOperatorRanking(
  statsWindow: StatsWindow,
  liveStatus: LiveStatus,
) {
  return useLiveQuery({
    queryKey: carrierKeys.operatorRanking(statsWindow),
    queryFn: (token) => getMyOperatorRanking(statsWindow, token),
    liveStatus,
    keepPrevious: true,
  });
}
