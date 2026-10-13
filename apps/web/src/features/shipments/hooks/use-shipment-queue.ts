'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { fallbackPollInterval, type LiveStatus } from '@/lib/live-status';
import { listQueue } from '../api';
import { shipmentKeys } from '../api/keys';
import type { ListQueueQuery } from '../types';

export function useShipmentQueue(
  query: ListQueueQuery,
  liveStatus: LiveStatus,
) {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: shipmentKeys.queueList(query),
    queryFn: () => listQueue(query, token),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: fallbackPollInterval(liveStatus),
  });
}
