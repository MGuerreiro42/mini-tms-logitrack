'use client';

import { useMemo, useState } from 'react';
import type { WebhookHealth } from '@/features/integrations/types';
import {
  type OverviewPoll,
  useSellerAttention,
  useSellerMetrics,
} from '@/features/shipments/hooks/use-seller-dashboard';
import { deliveryHealth } from '@/features/shipments/lib/delivery-health';
import type { StatsWindow } from '@/hooks/use-stats-window';
import { useThrottledValue } from '@/hooks/use-throttled-value';
import { exceptionTotal } from './exception-types';

// A storm of changes reads as one sentence at most every 10 s (spec 10 FR-032).
const ANNOUNCE_MS = 10_000;

interface Facts {
  exceptions?: number;
  health?: { level: string; text: string };
}

function sentence(before: Facts, after: Facts): string {
  const parts: string[] = [];
  if (
    before.exceptions !== undefined &&
    after.exceptions !== undefined &&
    before.exceptions !== after.exceptions
  )
    parts.push(`Exceptions ${before.exceptions} → ${after.exceptions}.`);
  if (
    before.health &&
    after.health &&
    before.health.level !== after.health.level
  )
    parts.push(`Delivery health now ${after.health.text}.`);
  return parts.join(' ');
}

// The page's one polite live region: the exception total and the Delivery health band.
// Webhooks going down use the strip's own alert; feed rows and flow moves are never spoken.
export function OverviewAnnouncer({
  statsWindow,
  poll,
  webhook,
}: {
  statsWindow: StatsWindow;
  poll: OverviewPoll;
  webhook: WebhookHealth | undefined;
}) {
  const attention = useSellerAttention(poll).data;
  const metrics = useSellerMetrics(statsWindow, poll).data;
  const exceptions = attention && exceptionTotal(attention, webhook?.state);
  const health = metrics && deliveryHealth(metrics);
  const level = health && 'level' in health ? health.level : undefined;
  const text =
    health && 'level' in health
      ? [health.level, health.heldBackBy && `held back by ${health.heldBackBy}`]
          .filter(Boolean)
          .join(', ')
      : undefined;
  // One identity per distinct pair, so the throttle sees a change only when one happens.
  const facts = useMemo<Facts>(
    () => ({
      exceptions,
      health: level && text ? { level, text } : undefined,
    }),
    [exceptions, level, text],
  );
  const shown = useThrottledValue(facts, ANNOUNCE_MS);
  const [said, setSaid] = useState({ facts: shown, message: '' });

  if (shown !== said.facts) {
    setSaid({
      facts: shown,
      message: sentence(said.facts, shown) || said.message,
    });
  }

  return (
    <p className="sr-only" aria-live="polite">
      {said.message}
    </p>
  );
}
