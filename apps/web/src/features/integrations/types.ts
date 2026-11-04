import type { PaginationQuery } from '@/types/pagination';

export type WebhookEvent = 'SHIPMENT_CREATED' | 'SHIPMENT_STATUS_CHANGED';
export type WebhookDeliveryStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreatedApiKey extends ApiKey {
  key: string;
}

export interface WebhookEndpoint {
  url: string;
  events: WebhookEvent[];
  active: boolean;
  secret: string;
  inboxUrl: string;
}

export type UpdateWebhookEndpointInput = Partial<
  Pick<WebhookEndpoint, 'url' | 'events' | 'active'>
>;

export interface WebhookDelivery {
  id: string;
  event: WebhookEvent;
  status: WebhookDeliveryStatus;
  attempts: number;
  responseCode: number | null;
  durationMs: number | null;
  error: string | null;
  nextAttemptAt: string | null;
  payload: unknown;
  createdAt: string;
}

export interface ListWebhookDeliveriesQuery extends PaginationQuery {
  status?: WebhookDeliveryStatus;
}

export interface WebhookInboxRequest {
  id: string;
  receivedAt: string;
  webhookId: string | null;
  body: string;
  signatureValid: boolean;
  responseStatus: number;
}

export interface WebhookInbox {
  failRequests: boolean;
  requests: WebhookInboxRequest[];
}
