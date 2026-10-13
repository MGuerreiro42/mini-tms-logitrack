'use client';

import { useLiveQuery } from '@/hooks/use-live-query';
import type { LiveStatus } from '@/lib/live-status';
import { getQueueShipment } from '../api';
import { shipmentKeys } from '../api/keys';

export function useQueueShipment(id: string, liveStatus: LiveStatus) {
  return useLiveQuery({
    queryKey: shipmentKeys.queueDetail(id),
    queryFn: (token) => getQueueShipment(id, token),
    liveStatus,
  });
}
