'use client';

import { useApiMutation } from '@/hooks/use-api-mutation';
import { useLiveQuery } from '@/hooks/use-live-query';
import type { LiveStatus } from '@/lib/live-status';
import { listWebhookDeliveries, replayWebhookDelivery } from '../api';
import { integrationKeys } from '../api/keys';
import type { ListWebhookDeliveriesQuery } from '../types';

export function useWebhookDeliveries(
  query: ListWebhookDeliveriesQuery,
  liveStatus: LiveStatus,
) {
  return useLiveQuery({
    queryKey: integrationKeys.deliveries(query),
    queryFn: (token) => listWebhookDeliveries(query, token),
    liveStatus,
    keepPrevious: true,
  });
}

export function useReplayDelivery() {
  return useApiMutation({
    mutationFn: (id: string, token) => replayWebhookDelivery(id, token),
    successMessage: 'Delivery sent again',
    invalidates: integrationKeys.deliveries(),
  });
}
