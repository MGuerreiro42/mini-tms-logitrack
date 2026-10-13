'use client';

import { useLiveQuery } from '@/hooks/use-live-query';
import type { LiveStatus } from '@/lib/live-status';
import { listQueue } from '../api';
import { shipmentKeys } from '../api/keys';
import type { ListQueueQuery } from '../types';

export function useShipmentQueue(
  query: ListQueueQuery,
  liveStatus: LiveStatus,
) {
  return useLiveQuery({
    queryKey: shipmentKeys.queueList(query),
    queryFn: (token) => listQueue(query, token),
    liveStatus,
    keepPrevious: true,
  });
}
