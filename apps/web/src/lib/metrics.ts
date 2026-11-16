// n is the denominator; rate is null at n = 0 (spec 07 FR-008).
export interface Rate {
  n: number;
  count: number;
  rate: number | null;
}

export type OnTimeTrend = Rate & { trend: (number | null)[] };

export interface ClaimMetric {
  p50Minutes: number | null;
  p90Minutes: number | null;
  n: number;
}

// Below this many samples a rate or median is noise: shown as "—", never as a number.
export const MIN_SAMPLE = 5;

// The on-time target every on-time tile, row and chart draws.
export const ON_TIME_TARGET = 90;

export const hasEnoughData = (n: number) => n >= MIN_SAMPLE;

// The popover's words for a sparkline: first point with data against the last.
export function trendDirection(values: (number | null)[]): string {
  const points = values.filter((value) => value !== null);
  const delta = (points.at(-1) ?? 0) - (points[0] ?? 0);
  if (points.length < 2 || Math.abs(delta) < 1) return 'steady';
  return delta > 0 ? 'rising' : 'falling';
}

export const notEnoughNote = (n: number, noun: 'deliveries' | 'data') =>
  `Not enough ${noun} (n=${n})`;

// The admin lists' 30-day scorecard per tenant (spec 07 FR-033).
export interface ListStats {
  shipments: number;
  onTime: Rate;
}
