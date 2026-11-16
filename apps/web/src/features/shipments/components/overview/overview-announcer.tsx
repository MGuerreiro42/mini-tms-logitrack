'use client';

import { useState } from 'react';
import type { WebhookHealth } from '@/features/integrations/types';
import {
  type OverviewPoll,
  useSellerAttention,
} from '@/features/shipments/hooks/use-seller-dashboard';
import { useThrottledValue } from '@/hooks/use-throttled-value';
import { exceptionTotal } from './exception-types';

// A storm of changes reads as one sentence at most every 10 s (spec 10 FR-032).
const ANNOUNCE_MS = 10_000;

// The page's one polite live region: only the exception count is spoken here; webhooks
// going down use the strip's own alert, and feed rows and flow moves are never spoken.
export function OverviewAnnouncer({
  poll,
  webhook,
}: {
  poll: OverviewPoll;
  webhook: WebhookHealth | undefined;
}) {
  const attention = useSellerAttention(poll).data;
  const exceptions = attention && exceptionTotal(attention, webhook?.state);
  const shown = useThrottledValue(exceptions, ANNOUNCE_MS);
  const [said, setSaid] = useState({ value: shown, message: '' });

  if (shown !== said.value) {
    setSaid({
      value: shown,
      message:
        said.value === undefined || shown === undefined
          ? ''
          : `Exceptions ${said.value} → ${shown}.`,
    });
  }

  return (
    <p className="sr-only" aria-live="polite">
      {said.message}
    </p>
  );
}
