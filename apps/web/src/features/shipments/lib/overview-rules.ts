import { formatMonthDay } from '@/lib/format-date';
import { hasEnoughData, type Rate } from '@/lib/metrics';
import type { SellerMetrics } from '../types';

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
