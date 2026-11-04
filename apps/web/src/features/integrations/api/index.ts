import { apiClient, toQueryString } from '@/services/api-client';
import type { Paginated } from '@/types/pagination';
import type {
  ApiKey,
  CreatedApiKey,
  ListWebhookDeliveriesQuery,
  UpdateWebhookEndpointInput,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookInbox,
} from '../types';

export function listApiKeys(token: string): Promise<ApiKey[]> {
  return apiClient<ApiKey[]>('/api-keys', undefined, token);
}

export function createApiKey(
  name: string,
  token: string,
): Promise<CreatedApiKey> {
  return apiClient<CreatedApiKey>(
    '/api-keys',
    { method: 'POST', body: JSON.stringify({ name }) },
    token,
  );
}

export function revokeApiKey(id: string, token: string): Promise<void> {
  return apiClient<void>(`/api-keys/${id}`, { method: 'DELETE' }, token);
}

export function getWebhookEndpoint(token: string): Promise<WebhookEndpoint> {
  return apiClient<WebhookEndpoint>('/webhooks/endpoint', undefined, token);
}

export function updateWebhookEndpoint(
  input: UpdateWebhookEndpointInput,
  token: string,
): Promise<WebhookEndpoint> {
  return apiClient<WebhookEndpoint>(
    '/webhooks/endpoint',
    { method: 'PATCH', body: JSON.stringify(input) },
    token,
  );
}

export function rotateWebhookSecret(token: string): Promise<WebhookEndpoint> {
  return apiClient<WebhookEndpoint>(
    '/webhooks/endpoint/rotate-secret',
    { method: 'POST' },
    token,
  );
}

export function listWebhookDeliveries(
  query: ListWebhookDeliveriesQuery,
  token: string,
): Promise<Paginated<WebhookDelivery>> {
  return apiClient<Paginated<WebhookDelivery>>(
    `/webhooks/deliveries${toQueryString({ ...query })}`,
    undefined,
    token,
  );
}

export function replayWebhookDelivery(
  id: string,
  token: string,
): Promise<WebhookDelivery> {
  return apiClient<WebhookDelivery>(
    `/webhooks/deliveries/${id}/replay`,
    { method: 'POST' },
    token,
  );
}

export function getWebhookInbox(token: string): Promise<WebhookInbox> {
  return apiClient<WebhookInbox>('/webhooks/inbox', undefined, token);
}

export function updateWebhookInbox(
  failRequests: boolean,
  token: string,
): Promise<WebhookInbox> {
  return apiClient<WebhookInbox>(
    '/webhooks/inbox',
    { method: 'PATCH', body: JSON.stringify({ failRequests }) },
    token,
  );
}
