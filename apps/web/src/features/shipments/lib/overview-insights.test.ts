import type { WebhookHealth } from '@/features/integrations/types';
import {
  attention,
  HOUR_MS,
  sellerMetrics,
  shipment,
} from '../components/overview/overview.fixtures';
import type { SellerMetrics, ShipmentAttention } from '../types';
import { insights } from './overview-rules';

const now = new Date();
const quiet = attention([], []);
const calm = sellerMetrics({
  comparison: { ...sellerMetrics().comparison, mature: false },
  byState: [],
});

const run = (
  overrides: Partial<{
    attention: ShipmentAttention;
    webhook: WebhookHealth;
    metrics: SellerMetrics;
  }>,
) =>
  insights({
    attention: quiet,
    webhook: undefined,
    metrics: calm,
    statsWindow: '90d',
    now,
    ...overrides,
  });

const down: WebhookHealth = {
  state: 'down',
  n: 10,
  successRate: 50,
  p95Ms: 200,
  lastSuccessAt: null,
  failingSince: '2026-11-16T17:02:00.000Z',
};

describe('insights', () => {
  it('stays quiet when no rule fires', () => {
    expect(run({})).toEqual([]);
  });

  it('names the oldest late shipment and who must act', () => {
    const late = shipment('late', 'IN_TRANSIT', -7);
    const [insight] = run({
      attention: {
        ...attention([late], []),
        oldestLateDueAt: new Date(now.getTime() - 7 * HOUR_MS).toISOString(),
      },
    });

    expect(insight).toMatchObject({
      text: '1 late, oldest 7 h · To Bauru/SP, in transit. Carrier must act.',
      href: '/seller/shipments?view=late',
      rule: 'late now > 0',
    });
  });

  it('says since when the webhooks are down', () => {
    expect(run({ webhook: down })[0]).toMatchObject({
      text: 'Webhooks down since 14:02',
      href: '/seller/integrations',
    });
  });

  it('counts shipments waiting for a carrier', () => {
    expect(
      run({
        attention: { ...quiet, counts: { ...quiet.counts, waiting: 2 } },
      })[0].text,
    ).toBe('2 waiting for a carrier over 2 h');
  });

  it('lists the stages whose slow tail is over budget, worst first', () => {
    const stage = (status: 'ACCEPTED' | 'IN_TRANSIT', p90: number) => ({
      status,
      p50Hours: 5,
      p90Hours: p90,
      budgetHours: 10,
      n: 20,
    });
    const [insight] = run({
      metrics: {
        ...calm,
        stages: [
          stage('ACCEPTED', 12),
          stage('IN_TRANSIT', 20),
          {
            ...stage('IN_TRANSIT', 40),
            status: 'OUT_FOR_DELIVERY',
            n: 3,
          },
        ],
      },
    });

    expect(insight).toMatchObject({
      text: 'Slow tail over budget · p90 line haul 20 h vs 10 h; pickup wait 12 h vs 10 h.',
      href: '#promise',
    });
  });

  it('flags the worst state under target, as a lead when the range reaches it', () => {
    const [insight] = run({
      metrics: {
        ...calm,
        byState: [
          { uf: 'SP', n: 96, count: 90, rate: 93.8 },
          { uf: 'PR', n: 9, count: 7, rate: 77.8 },
          { uf: 'MG', n: 3, count: 1, rate: 33.3 },
        ],
      },
    });

    expect(insight).toMatchObject({
      text: 'PR trails · 7 of 9 on time. Few deliveries: a lead, not a verdict.',
      href: '/seller/shipments?status=DELIVERED&window=90d&uf=PR',
    });
  });

  it('reports a rate change of 2 points or more against a mature window', () => {
    expect(run({ metrics: sellerMetrics({ byState: [] }) })[0]).toMatchObject({
      text: 'On time up 3.2 pts · 91.3% vs 88.1% in the previous 90 days.',
      href: '/seller/shipments?status=DELIVERED&window=90d&sla=late',
    });
  });

  it('runs only the late and webhook rules on thin data', () => {
    const fired = run({
      webhook: down,
      attention: { ...quiet, counts: { ...quiet.counts, waiting: 2 } },
      metrics: sellerMetrics({ shipments: 3 }),
    });

    expect(fired.map((insight) => insight.id)).toEqual(['webhooks']);
  });

  describe('stays quiet', () => {
    const movedBy = (onTime: number, firstAttempt: number) => {
      const base = sellerMetrics({ byState: [] });
      return sellerMetrics({
        byState: [],
        onTime: { ...base.onTime, rate: 90 },
        firstAttempt: { ...base.firstAttempt, rate: 92 },
        comparison: {
          ...base.comparison,
          onTime: { n: 84, count: 74, rate: 90 - onTime },
          firstAttempt: { n: 100, count: 92, rate: 92 - firstAttempt },
        },
      });
    };

    it('for a rate change under 2 points, firing from exactly 2', () => {
      expect(run({ metrics: movedBy(1.9, -1.9) })).toEqual([]);
      expect(run({ metrics: movedBy(2, 0) })[0].text).toMatch(
        /^On time up 2\.0 pts/,
      );
    });

    it('words a fall as down, and reports first attempt when on time held', () => {
      expect(run({ metrics: movedBy(-3, 0) })[0].text).toMatch(
        /^On time down 3\.0 pts/,
      );
      expect(run({ metrics: movedBy(0, 2.5) })[0]).toMatchObject({
        text: expect.stringMatching(/^First attempt up 2\.5 pts/),
        href: '/seller/shipments?view=exceptions',
      });
    });

    it('for a stage whose p90 equals its budget or has no budget', () => {
      const stage = (p90Hours: number, budgetHours: number | null) => ({
        status: 'IN_TRANSIT' as const,
        p50Hours: 5,
        p90Hours,
        budgetHours,
        n: 20,
      });

      expect(
        run({ metrics: { ...calm, stages: [stage(10, 10), stage(50, null)] } }),
      ).toEqual([]);
      expect(
        run({ metrics: { ...calm, stages: [stage(10.1, 10)] } })[0].id,
      ).toBe('slow-tail');
    });

    it('drops the lead caveat when the range cannot reach the target', () => {
      const [insight] = run({
        metrics: {
          ...calm,
          byState: [{ uf: 'MG', n: 50, count: 30, rate: 60 }],
        },
      });

      expect(insight.text).toBe('MG trails · 30 of 50 on time.');
    });

    it('for a degraded webhook', () => {
      expect(run({ webhook: { ...down, state: 'degraded' } })).toEqual([]);
    });
  });
});
