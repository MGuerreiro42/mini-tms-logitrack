'use client';

import { OfflineBanner } from '@/components/common/live-indicator';
import { useWebhookLive } from '../hooks/use-webhook-live';
import { WebhookDeliveriesTable } from './webhook-deliveries-table';
import { WebhookInboxPanel } from './webhook-inbox-panel';

export function WebhookActivity() {
  const live = useWebhookLive();

  return (
    <>
      <OfflineBanner status={live.status} />
      <WebhookInboxPanel live={live} />
      <WebhookDeliveriesTable liveStatus={live.status} />
    </>
  );
}
