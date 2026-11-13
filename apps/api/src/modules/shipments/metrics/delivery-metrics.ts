import { ShipmentStatus } from '../../../../generated/prisma/client';
import {
  groupBy,
  hoursBetween,
  MS_PER_HOUR,
  percentage,
  percentile,
  startOfDay,
} from '../../../shared/stats/stats';
import { TERMINAL_STATUSES } from '../shipment-status.util';

// One shipment created in the window, with what its history tells (see metric-rows.ts).
export interface MetricRow {
  createdAt: Date;
  carrierId: string;
  sellerId: string;
  ownerId: string | null;
  addressState: string;
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
// Spec 10 FR-008: a window compares once 80 % of its shipments are terminal or past due.
const MATURE_SHARE = 0.8;
const DAY_MS = 24 * MS_PER_HOUR;
const VOLUME_DAILY_UP_TO_MS = 30 * DAY_MS;

const VOLUME_SEGMENT: Partial<
  Record<ShipmentStatus, 'delivered' | 'problem' | 'open'>
> = {
  [ShipmentStatus.DELIVERED]: 'delivered',
  [ShipmentStatus.FAILED_DELIVERY]: 'problem',
  [ShipmentStatus.RETURNED]: 'problem',
  [ShipmentStatus.PENDING]: 'open',
  [ShipmentStatus.ACCEPTED]: 'open',
  [ShipmentStatus.COLLECTED]: 'open',
  [ShipmentStatus.IN_TRANSIT]: 'open',
  [ShipmentStatus.OUT_FOR_DELIVERY]: 'open',
};

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

export const onTimeByState = (rows: MetricRow[]) =>
  [...groupBy(rows.filter(isOnTimeSample), (row) => row.addressState)].map(
    ([uf, group]) => ({ uf, ...onTime(group) }),
  );

export const isMature = (rows: MetricRow[], now: Date): boolean =>
  rows.filter(
    (row) =>
      TERMINAL_STATUSES.includes(row.status) ||
      (row.dueAt !== null && row.dueAt < now),
  ).length >=
  MATURE_SHARE * rows.length;

// Created per calendar day (or per week from since, past 30 days), coloured by status now;
// cancelled left out.
export function volumeSeries(
  rows: MetricRow[],
  { since, now }: { since: Date; now: Date },
) {
  const daily = now.getTime() - since.getTime() <= VOLUME_DAILY_UP_TO_MS;
  const bucket = daily ? 'day' : 'week';
  const size = daily ? DAY_MS : 7 * DAY_MS;
  const origin = daily ? startOfDay(since) : since;
  const points = Array.from(
    {
      length: Math.max(1, Math.ceil((now.getTime() - origin.getTime()) / size)),
    },
    (_, i) => ({
      start: new Date(origin.getTime() + i * size),
      delivered: 0,
      problem: 0,
      open: 0,
    }),
  );
  for (const row of rows) {
    const segment = VOLUME_SEGMENT[row.status];
    const offset = row.createdAt.getTime() - origin.getTime();
    if (!segment || offset < 0) continue;
    points[Math.min(Math.floor(offset / size), points.length - 1)][segment]++;
  }
  return { bucket, points };
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

const outcomesOf = (rows: MetricRow[]) =>
  rows.filter((row) => isDelivered(row) || row.everFailed);

export function firstAttempt(rows: MetricRow[]): Rate {
  const outcomes = outcomesOf(rows);
  return rate(
    outcomes.filter((row) => !row.everFailed).length,
    outcomes.length,
  );
}

export function deliveryMetrics(
  rows: MetricRow[],
  { since, now }: { since: Date; now: Date },
) {
  const delivered = rows.filter(isDelivered);
  // The tile counts every DELIVERED row, so it equals the list it opens.
  const deliveredCount = rows.filter(
    (row) => row.status === ShipmentStatus.DELIVERED,
  ).length;
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
  const first = firstAttempt(rows);

  return {
    shipments: rows.length,
    delivered: deliveredCount,
    cancelled: rows.filter((row) => row.status === ShipmentStatus.CANCELLED)
      .length,
    onTime: { ...onTime(rows), trend: trend(rows, since, now) },
    medianDelivery: {
      hours: percentile(deliveryHours, 50),
      p90Hours: percentile(deliveryHours, 90),
      n: deliveryHours.length,
    },
    firstAttempt: {
      rate: first.rate,
      n: first.n,
      failed: first.n - first.count,
      returned: outcomesOf(rows).filter(
        (row) => row.status === ShipmentStatus.RETURNED,
      ).length,
    },
    claim: {
      p50Minutes: percentile(claimMinutes, 50),
      p90Minutes: percentile(claimMinutes, 90),
      n: claimMinutes.length,
    },
    slaMedianHours: slaMedian,
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
