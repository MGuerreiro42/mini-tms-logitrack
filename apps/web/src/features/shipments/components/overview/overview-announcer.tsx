'use client';

import { useMemo, useState } from 'react';
import {
  type OverviewPoll,
  useSellerMetrics,
} from '@/features/shipments/hooks/use-seller-dashboard';
import { deliveryHealth } from '@/features/shipments/lib/delivery-health';
import type { StatsWindow } from '@/hooks/use-stats-window';
import { useThrottledValue } from '@/hooks/use-throttled-value';

// A storm of changes reads as one sentence at most every 10 s (spec 10 FR-032).
const ANNOUNCE_MS = 10_000;

interface Facts {
  health?: { level: string; text: string };
}

function sentence(before: Facts, after: Facts): string {
  return before.health &&
    after.health &&
    before.health.level !== after.health.level
    ? `Delivery health now ${after.health.text}.`
    : '';
}

// The page's polite live region: only the Delivery health band. The exception count is the
// sidebar's announcer; webhooks going down use the strip's own alert; feed rows and flow moves are never spoken.
export function OverviewAnnouncer({
  statsWindow,
  poll,
}: {
  statsWindow: StatsWindow;
  poll: OverviewPoll;
}) {
  const metrics = useSellerMetrics(statsWindow, poll).data;
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
    () => ({ health: level && text ? { level, text } : undefined }),
    [level, text],
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
