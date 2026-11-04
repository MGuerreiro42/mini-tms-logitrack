import type { ListWebhookDeliveriesQuery } from '../types';

export const integrationKeys = {
  all: ['integrations'] as const,
  apiKeys: () => [...integrationKeys.all, 'api-keys'] as const,
  endpoint: () => [...integrationKeys.all, 'endpoint'] as const,
  inbox: () => [...integrationKeys.all, 'inbox'] as const,
  deliveries: (query?: ListWebhookDeliveriesQuery) =>
    query
      ? ([...integrationKeys.all, 'deliveries', query] as const)
      : ([...integrationKeys.all, 'deliveries'] as const),
};
