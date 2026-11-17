import type { WebhookHealth } from '@/features/integrations/types';
import type { StatsWindow } from '@/hooks/use-stats-window';
import { formatMonthDay, formatTime } from '@/lib/format-date';
import { formatDuration } from '@/lib/format-duration';
import {
  hasEnoughData,
  ON_TIME_TARGET,
  type Rate,
  STAGE_LABEL,
  type StageDuration,
} from '@/lib/metrics';
import { ROUTES } from '@/lib/routes';
import { SHIPMENT_STATUS_LABEL } from '@/lib/status-labels';
import type { SellerMetrics, ShipmentAttention } from '../types';
import { wilson } from './wilson';

type Sample = Pick<Rate, 'rate' | 'n'>;

export interface Delta {
  points: number;
  previous: number;
}

const oneDecimal = (value: number) => Math.round(value * 10) / 10;

// The rate change against the previous equal window: none below MIN_SAMPLE on either side,
// and held back while the current window still has too many open shipments (spec 10 FR-008).
export function deltaOf(
  current: Sample,
  previous: Sample,
  mature: boolean,
): Delta | 'immature' | null {
  if (
    current.rate === null ||
    previous.rate === null ||
    !hasEnoughData(current.n) ||
    !hasEnoughData(previous.n)
  )
    return null;
  if (!mature) return 'immature';
  return {
    points: oneDecimal(current.rate - previous.rate),
    previous: oneDecimal(previous.rate),
  };
}

export const isDelta = (delta: Delta | 'immature' | null): delta is Delta =>
  delta !== null && delta !== 'immature';

export const windowDeltas = ({
  onTime,
  firstAttempt,
  comparison,
}: SellerMetrics) => ({
  onTime: deltaOf(onTime, comparison.onTime, comparison.mature),
  firstAttempt: deltaOf(
    firstAttempt,
    comparison.firstAttempt,
    comparison.mature,
  ),
});

// "Aug 13 – Nov 11 · compared with May 15 – Aug 12"; the previous window ends the moment this one starts.
export function rangeLine(
  { since, previousSince }: { since: string; previousSince: string },
  compared: boolean,
  now: Date,
): string {
  const current = `${formatMonthDay(since)} – ${formatMonthDay(now.toISOString())}`;
  if (!compared) return current;
  const previousEnd = new Date(Date.parse(since) - 1).toISOString();
  return `${current} · compared with ${formatMonthDay(previousSince)} – ${formatMonthDay(previousEnd)}`;
}

export interface Insight {
  id: string;
  text: string;
  href: string;
  // The rule in words, shown on hover or focus.
  rule: string;
}

interface InsightInput {
  attention: ShipmentAttention;
  webhook: WebhookHealth | undefined;
  metrics: SellerMetrics | undefined;
  statsWindow: StatsWindow;
  now: Date;
}

const HOUR_MS = 3_600_000;
const MIN_DELTA_POINTS = 2;
export const RULE_COUNT = 6;

// Below MIN_SAMPLE shipments in the window only the "now" rules run (late, webhooks).
export const isThin = (metrics: SellerMetrics | undefined) =>
  !metrics || !hasEnoughData(metrics.shipments);

function lateRule({ attention, now }: InsightInput): Insight | null {
  const { late } = attention.counts;
  const oldest = attention.groups.find((group) => group.type === 'late')
    ?.items[0]?.shipment;
  if (late === 0 || !attention.oldestLateDueAt || !oldest) return null;
  const age = formatDuration(
    (now.getTime() - Date.parse(attention.oldestLateDueAt)) / HOUR_MS,
  );
  return {
    id: 'late',
    text: `${late} late, oldest ${age} · To ${oldest.addressCity}/${oldest.addressState}, ${SHIPMENT_STATUS_LABEL[oldest.status].toLowerCase()}. Carrier must act.`,
    href: ROUTES.sellerShipmentList('view=late'),
    rule: 'late now > 0',
  };
}

function webhookRule({ webhook }: InsightInput): Insight | null {
  if (webhook?.state !== 'down') return null;
  return {
    id: 'webhooks',
    text: `Webhooks down${webhook.failingSince ? ` since ${formatTime(webhook.failingSince)}` : ''}`,
    href: ROUTES.sellerIntegrations,
    rule: 'last 5 deliveries failed',
  };
}

function waitingRule({ attention }: InsightInput): Insight | null {
  const { waiting } = attention.counts;
  if (waiting === 0) return null;
  return {
    id: 'waiting',
    text: `${waiting} waiting for a carrier over 2 h`,
    href: ROUTES.sellerShipmentList('view=waiting'),
    rule: 'waiting > 0',
  };
}

// Stages whose slow tail (p90) runs past their budget, n ≥ 5, worst overrun first.
export const overBudget = (stages: StageDuration[]) =>
  stages
    .flatMap(({ status, p90Hours, budgetHours, n }) =>
      hasEnoughData(n) &&
      p90Hours !== null &&
      budgetHours !== null &&
      p90Hours > budgetHours
        ? [{ status, p90Hours, budgetHours }]
        : [],
    )
    .sort((a, b) => b.p90Hours - b.budgetHours - (a.p90Hours - a.budgetHours));

const stageName = (status: StageDuration['status']) =>
  STAGE_LABEL[status]?.toLowerCase() ?? status;

const listed = (words: string[]) =>
  words.length < 2
    ? words.join('')
    : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;

// The one sentence under Promise against reality, built from the data (spec 10 FR-030).
export function promiseSummary(
  stages: StageDuration[],
  medianHours: number | null,
  slaHours: number | null,
): string {
  const over = overBudget(stages);
  if (over.length === 0) return "Every stage's slow tail sits within budget.";
  const tail = `lateness lives in the tail of ${listed(over.map(({ status }) => stageName(status)))}.`;
  return medianHours !== null && slaHours !== null && medianHours < slaHours
    ? `The typical shipment arrives with ${formatDuration(slaHours - medianHours)} to spare; ${tail}`
    : `L${tail.slice(1)}`;
}

function slowTailRule({ metrics }: InsightInput): Insight | null {
  const over = overBudget(metrics?.stages ?? []);
  if (over.length === 0) return null;
  const parts = over.map(
    ({ status, p90Hours, budgetHours }) =>
      `${stageName(status)} ${formatDuration(p90Hours)} vs ${formatDuration(budgetHours)}`,
  );
  return {
    id: 'slow-tail',
    text: `Slow tail over budget · p90 ${parts.join('; ')}.`,
    href: '#promise',
    rule: 'stage p90 > budget, n ≥ 5',
  };
}

function stateRule({ metrics, statsWindow }: InsightInput): Insight | null {
  const [worst] = (metrics?.byState ?? [])
    .filter(
      ({ n, rate }) =>
        hasEnoughData(n) && rate !== null && rate < ON_TIME_TARGET,
    )
    .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0));
  if (!worst) return null;
  const lead =
    wilson(worst.count, worst.n).high >= ON_TIME_TARGET
      ? ' Few deliveries: a lead, not a verdict.'
      : '';
  return {
    id: 'state',
    text: `${worst.uf} trails · ${worst.count} of ${worst.n} on time.${lead}`,
    href: ROUTES.sellerShipmentList(
      `status=DELIVERED&window=${statsWindow}&uf=${worst.uf}`,
    ),
    rule: 'UF below target, n ≥ 5',
  };
}

function deltaRule({ metrics, statsWindow }: InsightInput): Insight | null {
  if (!metrics) return null;
  const deltas = windowDeltas(metrics);
  const candidates = [
    {
      name: 'On time',
      delta: deltas.onTime,
      rate: metrics.onTime.rate,
      search: `status=DELIVERED&window=${statsWindow}&sla=late`,
    },
    {
      name: 'First attempt',
      delta: deltas.firstAttempt,
      rate: metrics.firstAttempt.rate,
      search: 'view=exceptions',
    },
  ];
  const moved = candidates.find(
    ({ delta }) => isDelta(delta) && Math.abs(delta.points) >= MIN_DELTA_POINTS,
  );
  if (!moved || !isDelta(moved.delta)) return null;
  const { points, previous } = moved.delta;
  return {
    id: 'delta',
    text: `${moved.name} ${points > 0 ? 'up' : 'down'} ${Math.abs(points).toFixed(1)} pts · ${moved.rate?.toFixed(1)}% vs ${previous.toFixed(1)}% in the previous ${Number.parseInt(statsWindow, 10)} days.`,
    href: ROUTES.sellerShipmentList(moved.search),
    rule: '|Δ| ≥ 2 pts, both n ≥ 5, mature',
  };
}

const NOW_RULES = [lateRule, webhookRule];
const WINDOW_RULES = [waitingRule, slowTailRule, stateRule, deltaRule];

// The fired sentences in priority order (spec 10 FR-024).
export function insights(input: InsightInput): Insight[] {
  const rules = isThin(input.metrics)
    ? NOW_RULES
    : [...NOW_RULES, ...WINDOW_RULES];
  return rules.flatMap((rule) => rule(input) ?? []);
}
