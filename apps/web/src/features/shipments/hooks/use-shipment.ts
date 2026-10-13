'use client';

import { useLiveQuery } from '@/hooks/use-live-query';
import type { LiveStatus } from '@/lib/live-status';
import { getShipment } from '../api';
import { shipmentKeys } from '../api/keys';

export function useShipment(id: string, liveStatus: LiveStatus) {
  return useLiveQuery({
    queryKey: shipmentKeys.detail(id),
    queryFn: (token) => getShipment(id, token),
    liveStatus,
  });
}
