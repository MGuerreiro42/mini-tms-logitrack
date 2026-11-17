import type { SellerMetrics } from '../types';

// Worst to best, so a band is its index (spec 10 FR-026).
export const HEALTH_LEVELS = [
  'Critical',
  'Poor',
  'Fair',
  'Good',
  'Excellent',
] as const;
export type HealthLevel = (typeof HEALTH_LEVELS)[number];

// A benchmark, not the seller's goal: revisit once real data exists (spec 10 Resolved 1).
const RATE_FLOORS = [95, 90, 85, 80];
const SHARE_CEILINGS = [2, 4, 6, 8];
const MIN_DELIVERIES = 10;

export type DeliveryHealth =
  | { level: HealthLevel; heldBackBy: string | null }
  | { building: number };

function band(value: number, higherIsBetter: boolean): number {
  const met = higherIsBetter
    ? RATE_FLOORS.findIndex((floor) => value >= floor)
    : SHARE_CEILINGS.findIndex((ceiling) => value <= ceiling);
  return met === -1 ? 0 : HEALTH_LEVELS.length - 1 - met;
}

const share = (part: number, whole: number) =>
  whole > 0 ? (part / whole) * 100 : null;

// The level is the worst input's band; "held back by" names the first input in it.
export function deliveryHealth({
  delivered,
  shipments,
  cancelled,
  onTime,
  firstAttempt,
}: SellerMetrics): DeliveryHealth {
  if (delivered < MIN_DELIVERIES) return { building: delivered };
  const inputs = [
    { name: 'on time', value: onTime.rate, n: onTime.n, higher: true },
    {
      name: 'first attempt',
      value: firstAttempt.rate,
      n: firstAttempt.n,
      higher: true,
    },
    {
      name: 'returns',
      value: share(firstAttempt.returned, firstAttempt.n),
      n: firstAttempt.n,
      higher: false,
    },
    {
      name: 'cancelled',
      value: share(cancelled, shipments),
      n: shipments,
      higher: false,
    },
  ].flatMap(({ value, higher, ...input }) =>
    value === null ? [] : [{ ...input, value, band: band(value, higher) }],
  );
  const worst = Math.min(...inputs.map((input) => input.band));
  const first = inputs.find((input) => input.band === worst);
  return {
    level: HEALTH_LEVELS[worst],
    heldBackBy:
      first && worst < HEALTH_LEVELS.length - 1
        ? `${first.name} ${first.value.toFixed(1)}% (n=${first.n})`
        : null,
  };
}
