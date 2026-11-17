'use client';

import { CircleAlertIcon, CircleIcon } from 'lucide-react';
import { TextLink } from '@/components/common/text-link';
import type { WebhookHealth } from '@/features/integrations/types';
import { useNow } from '@/hooks/use-now';
import { formatTime, formatTimeAgo } from '@/lib/format-date';
import { ROUTES } from '@/lib/routes';

const SLA_REFRESH_MS = 60_000;

// The health window is 24 h, so no success in it reads as such, never as a date.
export const lastSuccessText = (health: WebhookHealth, now: Date) =>
  health.lastSuccessAt
    ? `last success ${formatTimeAgo(health.lastSuccessAt, now)}`
    : 'no success in 24 h';

const latency = (ms: number) =>
  ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;

function stats(health: WebhookHealth, now: Date): string {
  const parts =
    health.state === 'down'
      ? [
          health.failingSince &&
            `failing since ${formatTime(health.failingSince)}`,
        ]
      : [
          `${health.successRate?.toFixed(0)}% of ${health.n} deliveries succeeded`,
          health.p95Ms !== null && `p95 ${latency(health.p95Ms)}`,
        ];
  return [...parts, lastSuccessText(health, now)].filter(Boolean).join(' · ');
}

// Shown only when degraded or down (States C); down interrupts, degraded waits its turn.
export function WebhookStrip({
  health,
}: {
  health: WebhookHealth | undefined;
}) {
  const now = useNow(SLA_REFRESH_MS);
  if (health?.state !== 'down' && health?.state !== 'degraded') return null;
  const down = health.state === 'down';
  const Icon = down ? CircleAlertIcon : CircleIcon;

  return (
    <div
      role={down ? 'alert' : 'status'}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-notice px-4 py-3 text-sm text-notice-foreground"
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">
          Webhooks {down ? 'down' : 'degraded'}
        </span>{' '}
        {stats(health, now)}
      </p>
      <TextLink href={ROUTES.sellerIntegrations} className="font-semibold">
        Open Integrations
      </TextLink>
    </div>
  );
}
