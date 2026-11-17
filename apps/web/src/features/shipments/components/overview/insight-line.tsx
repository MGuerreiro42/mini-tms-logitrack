'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { WebhookHealth } from '@/features/integrations/types';
import {
  type OverviewPoll,
  useSellerAttention,
  useSellerMetrics,
} from '@/features/shipments/hooks/use-seller-dashboard';
import { deliveryHealth } from '@/features/shipments/lib/delivery-health';
import {
  type Insight,
  insights,
  isThin,
  RULE_COUNT,
} from '@/features/shipments/lib/overview-rules';
import type { SellerMetrics } from '@/features/shipments/types';
import { useNow } from '@/hooks/use-now';
import type { StatsWindow } from '@/hooks/use-stats-window';
import { formatTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { DeliveryHealthCell } from './delivery-health';

const SLA_REFRESH_MS = 60_000;
// One row at ≥ 1100 px: Delivery health and three sentences.
const MAX_SENTENCES = 3;
// Below 600 px two sentences show, the rest behind "N more".
const NARROW_SENTENCES = 2;

export function InsightLine({
  statsWindow,
  poll,
  webhook,
}: {
  statsWindow: StatsWindow;
  poll: OverviewPoll;
  webhook: WebhookHealth | undefined;
}) {
  const attention = useSellerAttention(poll);
  const metricsQuery = useSellerMetrics(statsWindow, poll);
  const metrics = metricsQuery.data;
  const now = useNow(SLA_REFRESH_MS);
  if (!attention.data) return null;

  return (
    <section
      aria-labelledby="insights-title"
      className="rounded-xl bg-card px-5 py-4 shadow-panel"
    >
      <h2 id="insights-title" className="sr-only">
        Worth your attention
      </h2>
      <InsightCells
        metrics={metrics}
        metricsFailed={metricsQuery.isError}
        fired={insights({
          attention: attention.data,
          webhook,
          metrics,
          statsWindow,
          now,
        }).slice(0, MAX_SENTENCES)}
        checkedAt={attention.dataUpdatedAt}
      />
    </section>
  );
}

function InsightCells({
  metrics,
  metricsFailed,
  fired,
  checkedAt,
}: {
  metrics: SellerMetrics | undefined;
  metricsFailed: boolean;
  fired: Insight[];
  checkedAt: number;
}) {
  // A sentence that fires after the first render fades in once; the first ones just appear.
  const [initial] = useState(() => new Set(fired.map(({ id }) => id)));
  const [expanded, setExpanded] = useState(false);
  // Without metrics only the "now" rules ran: that is loading or failed, never "thin".
  const thin = metrics !== undefined && isThin(metrics);
  const hidden = fired.length - NARROW_SENTENCES;

  return (
    <ul className="grid gap-x-6 gap-y-4 @min-[600px]:grid-cols-2 @min-[1100px]:grid-cols-4">
      {metrics && (
        <li>
          <DeliveryHealthCell health={deliveryHealth(metrics)} />
        </li>
      )}
      {fired.map((insight, index) => (
        <li
          key={insight.id}
          className={cn(
            !initial.has(insight.id) && 'animate-enter',
            index >= NARROW_SENTENCES && !expanded && '@max-[600px]:hidden',
          )}
        >
          <InsightSentence insight={insight} />
        </li>
      ))}
      {fired.length === 0 && metrics && !thin && (
        <li className="text-[13px] text-muted-foreground">
          Nothing needs you right now · Checked{' '}
          {formatTime(new Date(checkedAt).toISOString())} against {RULE_COUNT}{' '}
          rules
        </li>
      )}
      {thin && (
        <li className="text-[13px] text-muted-foreground">
          Not enough history to call trends yet · Only "late" and "webhooks"
          rules run (n = {metrics.shipments})
        </li>
      )}
      {!metrics && (
        <li className="text-[13px] text-muted-foreground">
          {metricsFailed
            ? "Couldn't load your delivery trends."
            : 'Checking your delivery trends…'}
        </li>
      )}
      {hidden > 0 && (
        <li className="@min-[600px]:hidden">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
            className="min-h-11 text-[13px] font-medium text-primary underline-offset-4 outline-ring hover:underline focus-visible:outline-2"
          >
            {expanded ? 'Show fewer' : `${hidden} more`}
          </button>
        </li>
      )}
    </ul>
  );
}

function InsightSentence({ insight }: { insight: Insight }) {
  return (
    <Link
      href={insight.href}
      className="group relative flex flex-col gap-1 rounded-sm text-[13px] outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 pointer-coarse:min-h-11"
    >
      <span className="group-hover:underline">{insight.text}</span>
      <span className="absolute top-full z-10 bg-card font-mono text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        rule: {insight.rule}
      </span>
    </Link>
  );
}
