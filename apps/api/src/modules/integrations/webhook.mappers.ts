import type {
  WebhookDelivery,
  WebhookEndpoint,
} from '../../../generated/prisma/client';
import type { WebhookDeliveryResponseDto } from './dto/webhook-delivery-response.dto';
import type { WebhookEndpointResponseDto } from './dto/webhook-endpoint-response.dto';

export const toWebhookEndpointResponseDto = (
  endpoint: WebhookEndpoint,
  inboxUrl: string,
): WebhookEndpointResponseDto => ({
  url: endpoint.url,
  events: endpoint.events,
  active: endpoint.active,
  secret: endpoint.secret,
  inboxUrl,
});

export const toWebhookDeliveryResponseDto = (
  delivery: WebhookDelivery,
): WebhookDeliveryResponseDto => ({
  id: delivery.id,
  event: delivery.event,
  status: delivery.status,
  attempts: delivery.attempts,
  responseCode: delivery.responseCode,
  durationMs: delivery.durationMs,
  error: delivery.error,
  nextAttemptAt: delivery.nextAttemptAt,
  payload: delivery.payload,
  createdAt: delivery.createdAt,
});
