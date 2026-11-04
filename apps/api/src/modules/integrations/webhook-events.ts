import type { WebhookDeliveryResponseDto } from './dto/webhook-delivery-response.dto';
import type { WebhookInboxRequestDto } from './dto/webhook-inbox-response.dto';

export const WEBHOOK_DELIVERY_UPDATED = 'webhook.delivery-updated';
export const WEBHOOK_INBOX_RECEIVED = 'webhook.inbox-received';

export interface WebhookDeliveryUpdatedEvent {
  sellerId: string;
  delivery: WebhookDeliveryResponseDto;
}

export interface WebhookInboxReceivedEvent {
  sellerId: string;
  request: WebhookInboxRequestDto;
}
