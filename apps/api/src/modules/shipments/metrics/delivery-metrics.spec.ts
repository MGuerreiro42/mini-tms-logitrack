import { ShipmentStatus } from '../../../../generated/prisma/client';
import {
  deliveryMetrics,
  firstAttempt,
  isMature,
  type MetricRow,
  onTime,
  onTimeByState,
  volumeSeries,
} from './delivery-metrics';

const HOUR = 3_600_000;
const now = new Date('2026-01-13T00:00:00Z');
const since = new Date('2026-01-01T00:00:00Z');
const at = (hours: number) => new Date(since.getTime() + hours * HOUR);

const row = (overrides: Partial<MetricRow> = {}): MetricRow => ({
  createdAt: at(0),
  carrierId: 'carrier-1',
  sellerId: 'seller-1',
  ownerId: null,
  addressState: 'SP',
  status: ShipmentStatus.DELIVERED,
  dueAt: at(24),
  deliveredAt: at(10),
  modality: { code: 'EXPRESS', name: 'Express', slaHours: 24 },
  acceptedAt: null,
  everFailed: false,
  stages: [],
  ...overrides,
});

describe('deliveryMetrics', () => {
  it('counts deliveredAt = dueAt as on time', () => {
    expect(onTime([row({ deliveredAt: at(24) })])).toEqual({
      n: 1,
      count: 1,
      rate: 100,
    });
    expect(onTime([row({ deliveredAt: at(24.001) })]).rate).toBe(0);
  });

  it('leaves a delivery without dueAt out of n but in delivered', () => {
    const metrics = deliveryMetrics([row({ dueAt: null }), row()], {
      since,
      now,
    });

    expect(metrics.delivered).toBe(2);
    expect(metrics.onTime).toMatchObject({ n: 1, count: 1, rate: 100 });
  });

  it('counts a failed-then-returned shipment as a failed first attempt', () => {
    const metrics = deliveryMetrics(
      [
        row(),
        row({
          status: ShipmentStatus.RETURNED,
          deliveredAt: null,
          everFailed: true,
        }),
        // Still open and never failed: not an outcome yet.
        row({ status: ShipmentStatus.IN_TRANSIT, deliveredAt: null }),
        // Delivered without a delivery time: no outcome, as in delivered.
        row({ deliveredAt: null }),
      ],
      { since, now },
    );

    expect(metrics.firstAttempt).toEqual({
      rate: 50,
      n: 2,
      failed: 1,
      returned: 1,
    });
  });

  it('gives null rates and medians for an empty window, never 0', () => {
    const metrics = deliveryMetrics([], { since, now });

    expect(metrics.shipments).toBe(0);
    expect(metrics.onTime.rate).toBeNull();
    expect(metrics.onTime.trend).toEqual(Array(12).fill(null));
    expect(metrics.medianDelivery).toEqual({
      hours: null,
      p90Hours: null,
      n: 0,
    });
    expect(metrics.firstAttempt.rate).toBeNull();
    expect(metrics.claim).toEqual({ p50Minutes: null, p90Minutes: null, n: 0 });
    expect(metrics.stages.every((stage) => stage.p50Hours === null)).toBe(true);
  });

  it('places the window edges in the first and the last of 12 buckets', () => {
    const { trend } = deliveryMetrics(
      [
        row({ createdAt: since, deliveredAt: at(1), dueAt: at(2) }),
        row({ createdAt: at(23.99), deliveredAt: at(30), dueAt: at(25) }),
        row({ createdAt: at(24) }),
        row({ createdAt: now, deliveredAt: at(400), dueAt: at(300) }),
        // Created after now (clock skew): still the last bucket.
        row({ createdAt: at(300), deliveredAt: at(301), dueAt: at(400) }),
        row({ createdAt: at(-1) }),
      ],
      { since, now },
    ).onTime;

    expect(trend).toEqual([
      50,
      100,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      50,
    ]);
  });

  it('puts every row in the last bucket when the window has no span', () => {
    const { trend } = deliveryMetrics([row({ createdAt: now })], {
      since: now,
      now,
    }).onTime;

    expect(trend.at(-1)).toBe(100);
    expect(trend.slice(0, -1).every((rate) => rate === null)).toBe(true);
  });

  it('takes nearest-rank medians of delivery, claim and stage times', () => {
    const metrics = deliveryMetrics(
      [
        row({
          deliveredAt: at(10),
          acceptedAt: at(0.5),
          stages: [{ status: ShipmentStatus.PENDING, hours: 0.5 }],
        }),
        row({ deliveredAt: at(20), acceptedAt: at(1) }),
        row({ deliveredAt: at(90), acceptedAt: at(2) }),
      ],
      { since, now },
    );

    expect(metrics.medianDelivery).toEqual({ hours: 20, p90Hours: 90, n: 3 });
    expect(metrics.claim).toEqual({ p50Minutes: 60, p90Minutes: 120, n: 3 });
    expect(metrics.stages[0]).toEqual({
      status: ShipmentStatus.PENDING,
      p50Hours: 0.5,
      p90Hours: 0.5,
      // 10 % of the median slaHours (24).
      budgetHours: expect.closeTo(2.4),
      n: 1,
    });
    expect(
      metrics.stages.map((stage) => stage.budgetHours?.toFixed(1)),
    ).toEqual(['2.4', '4.8', '2.4', '9.6', '4.8']);
  });

  it('counts the cancelled rows and returns the budget base', () => {
    const metrics = deliveryMetrics(
      [
        row({ status: ShipmentStatus.CANCELLED, deliveredAt: null }),
        row({ modality: { code: 'STANDARD', name: 'Standard', slaHours: 72 } }),
        row({ modality: { code: 'STANDARD', name: 'Standard', slaHours: 72 } }),
      ],
      { since, now },
    );

    expect(metrics.cancelled).toBe(1);
    expect(metrics.slaMedianHours).toBe(72);
  });
});

describe('firstAttempt', () => {
  it('is a rate of the outcomes that never failed', () => {
    expect(
      firstAttempt([
        row(),
        row({ status: ShipmentStatus.RETURNED, everFailed: true }),
        row({ status: ShipmentStatus.IN_TRANSIT, deliveredAt: null }),
      ]),
    ).toEqual({ n: 2, count: 1, rate: 50 });
  });
});

describe('onTimeByState', () => {
  it('groups the on-time samples by destination UF', () => {
    expect(
      onTimeByState([
        row({ addressState: 'PR' }),
        row({ addressState: 'PR', deliveredAt: at(30) }),
        row({ addressState: 'RJ' }),
        row({ addressState: 'MG', dueAt: null }),
      ]),
    ).toEqual([
      { uf: 'PR', n: 2, count: 1, rate: 50 },
      { uf: 'RJ', n: 1, count: 1, rate: 100 },
    ]);
  });
});

describe('volumeSeries', () => {
  const open = { status: ShipmentStatus.IN_TRANSIT, deliveredAt: null };

  it('buckets a window up to 30 days by day, from its start', () => {
    const { bucket, points } = volumeSeries(
      [
        row({ createdAt: at(1) }),
        row({ createdAt: at(25), ...open }),
        row({ createdAt: at(26), status: ShipmentStatus.RETURNED }),
        row({ createdAt: at(27), status: ShipmentStatus.CANCELLED }),
        row({ createdAt: now, status: ShipmentStatus.FAILED_DELIVERY }),
      ],
      { since, now },
    );

    expect(bucket).toBe('day');
    expect(points).toHaveLength(12);
    expect(points[0]).toEqual({
      start: since,
      delivered: 1,
      problem: 0,
      open: 0,
    });
    expect(points[1]).toEqual({
      start: at(24),
      delivered: 0,
      problem: 1,
      open: 1,
    });
    expect(points[11]).toMatchObject({ start: at(11 * 24), problem: 1 });
  });

  it('buckets a longer window by week, the last one partial', () => {
    const { bucket, points } = volumeSeries([], {
      since: new Date(now.getTime() - 90 * 24 * HOUR),
      now,
    });

    expect(bucket).toBe('week');
    expect(points).toHaveLength(13);
  });
});

describe('isMature', () => {
  const closed = row();
  const pastDue = row({ status: ShipmentStatus.IN_TRANSIT, dueAt: at(1) });
  const onTheClock = row({
    status: ShipmentStatus.IN_TRANSIT,
    dueAt: at(400),
  });

  it('needs 80 % of the shipments terminal or past due', () => {
    expect(isMature([closed, closed, closed, pastDue, onTheClock], now)).toBe(
      true,
    );
    expect(
      isMature([closed, closed, pastDue, onTheClock, onTheClock], now),
    ).toBe(false);
  });
});
