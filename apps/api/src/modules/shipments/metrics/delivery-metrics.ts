import { ShipmentStatus } from '../../../../generated/prisma/client';
import {
  hoursBetween,
  percentage,
  percentile,
} from '../../../shared/stats/stats';

// One shipment created in the window, with what its history tells (see metric-rows.ts).
export interface MetricRow {
  createdAt: Date;
  ownerId: string | null;
  status: ShipmentStatus;
  dueAt: Date | null;
  deliveredAt: Date | null;
  modality: { code: string; name: string; slaHours: number | null };
  acceptedAt: Date | null;
  everFailed: boolean;
  stages: { status: ShipmentStatus; hours: number }[];
}

export interface Rate {
  n: number;
  count: number;
  // Null at n = 0: no sample is not a 0 % rate.
  rate: number | null;
}

export const TREND_BUCKETS = 12;

// Each happy-path stage, named by the status a shipment sits in, in lifecycle order, with its
// budget as a share of the window's median slaHours (spec 07 FR-016).
export const STAGE_BUDGET_SHARE: Partial<Record<ShipmentStatus, number>> = {
  [ShipmentStatus.PENDING]: 0.1,
  [ShipmentStatus.ACCEPTED]: 0.2,
  [ShipmentStatus.COLLECTED]: 0.1,
  [ShipmentStatus.IN_TRANSIT]: 0.4,
  [ShipmentStatus.OUT_FOR_DELIVERY]: 0.2,
};
export const STAGE_STATUSES = Object.keys(
  STAGE_BUDGET_SHARE,
) as ShipmentStatus[];

const rate = (count: number, n: number): Rate => ({
  n,
  count,
  rate: n > 0 ? percentage(count, n) : null,
});

// The on-time rule of spec 05: delivered no later than dueAt; no dueAt, no sample.
export const isOnTimeSample = (row: MetricRow): boolean =>
  row.status === ShipmentStatus.DELIVERED &&
  row.dueAt !== null &&
  row.deliveredAt !== null;

export function onTime(rows: MetricRow[]): Rate {
  const sampled = rows.filter(isOnTimeSample);
  const count = sampled.filter(
    (row) => (row.deliveredAt as Date) <= (row.dueAt as Date),
  ).length;
  return rate(count, sampled.length);
}

function trend(rows: MetricRow[], since: Date, now: Date): (number | null)[] {
  const span = now.getTime() - since.getTime();
  const buckets: MetricRow[][] = Array.from(
    { length: TREND_BUCKETS },
    () => [],
  );
  for (const row of rows) {
    const offset = row.createdAt.getTime() - since.getTime();
    if (offset < 0) continue;
    // createdAt at or after now (clock skew, an empty span) belongs to the last bucket.
    const index =
      span > 0
        ? Math.min(
            Math.floor((offset / span) * TREND_BUCKETS),
            TREND_BUCKETS - 1,
          )
        : TREND_BUCKETS - 1;
    buckets[index].push(row);
  }
  return buckets.map((bucket) => onTime(bucket).rate);
}

const minutesBetween = (from: Date, to: Date) => hoursBetween(from, to) * 60;

const isDelivered = (row: MetricRow) =>
  row.status === ShipmentStatus.DELIVERED && row.deliveredAt !== null;

export function deliveryMetrics(
  rows: MetricRow[],
  { since, now }: { since: Date; now: Date },
) {
  const delivered = rows.filter(isDelivered);
  // The tile counts every DELIVERED row, so it equals the list it opens.
  const deliveredCount = rows.filter(
    (row) => row.status === ShipmentStatus.DELIVERED,
  ).length;
  const outcomes = rows.filter((row) => isDelivered(row) || row.everFailed);
  const claimMinutes = rows.flatMap((row) =>
    row.acceptedAt ? [minutesBetween(row.createdAt, row.acceptedAt)] : [],
  );
  const deliveryHours = delivered.map((row) =>
    hoursBetween(row.createdAt, row.deliveredAt as Date),
  );
  // Budget base: the median slaHours over every shipment of the window with an SLA, so one
  // budget per stage covers a mix of modalities.
  const slaMedian = percentile(
    rows.flatMap((row) =>
      row.modality.slaHours === null ? [] : [row.modality.slaHours],
    ),
    50,
  );
  const first = rate(
    outcomes.filter((row) => !row.everFailed).length,
    outcomes.length,
  );

  return {
    shipments: rows.length,
    delivered: deliveredCount,
    onTime: { ...onTime(rows), trend: trend(rows, since, now) },
    medianDelivery: {
      hours: percentile(deliveryHours, 50),
      n: deliveryHours.length,
    },
    firstAttempt: {
      rate: first.rate,
      n: first.n,
      failed: first.n - first.count,
      returned: outcomes.filter((row) => row.status === ShipmentStatus.RETURNED)
        .length,
    },
    claim: {
      p50Minutes: percentile(claimMinutes, 50),
      p90Minutes: percentile(claimMinutes, 90),
      n: claimMinutes.length,
    },
    stages: STAGE_STATUSES.map((status) => {
      const hours = rows.flatMap((row) =>
        row.stages.filter((s) => s.status === status).map((s) => s.hours),
      );
      return {
        status,
        p50Hours: percentile(hours, 50),
        p90Hours: percentile(hours, 90),
        budgetHours:
          slaMedian === null
            ? null
            : slaMedian * (STAGE_BUDGET_SHARE[status] as number),
        n: hours.length,
      };
    }),
  };
}

export type DeliveryMetrics = ReturnType<typeof deliveryMetrics>;
