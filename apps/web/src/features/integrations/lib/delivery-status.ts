import { withLabels } from '@/lib/status-colors';
import type { WebhookDeliveryStatus, WebhookEvent } from '../types';

export const WEBHOOK_DELIVERY_STATUS = withLabels<WebhookDeliveryStatus>(
  { PENDING: 'Pending', SUCCEEDED: 'Succeeded', FAILED: 'Failed' },
  {
    PENDING: 'bg-status-pending-bg text-status-pending-fg',
    SUCCEEDED: 'bg-status-delivered-bg text-status-delivered-fg',
    FAILED: 'bg-status-failed-delivery-bg text-status-failed-delivery-fg',
  },
);

export const WEBHOOK_DELIVERY_STATUSES = Object.keys(
  WEBHOOK_DELIVERY_STATUS,
) as WebhookDeliveryStatus[];

// The names receivers see in the payload's `type`.
export const WEBHOOK_EVENT_LABEL: Record<WebhookEvent, string> = {
  SHIPMENT_CREATED: 'shipment.created',
  SHIPMENT_STATUS_CHANGED: 'shipment.status_changed',
};

export const WEBHOOK_EVENTS = Object.keys(
  WEBHOOK_EVENT_LABEL,
) as WebhookEvent[];
