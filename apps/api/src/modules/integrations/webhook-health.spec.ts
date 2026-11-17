import { webhookHealth } from './webhook-health';

const at = (minute: number) => new Date(Date.UTC(2026, 0, 1, 12, minute));
// Newest first, as the service reads them.
// One attempt each: S succeeded, F failed for good, P failed and waits for its retry.
const deliveries = (statuses: string) =>
  [...statuses].map((s, i) => ({
    status: ({ S: 'SUCCEEDED', F: 'FAILED', P: 'PENDING' } as const)[
      s as 'S' | 'F' | 'P'
    ],
    attempts: 1,
    durationMs: (i + 1) * 100,
    updatedAt: at(60 - i),
  }));

describe('webhookHealth', () => {
  it('is too_few below 5 attempts', () => {
    expect(webhookHealth(deliveries('PPPP'))).toMatchObject({
      state: 'too_few',
      n: 4,
      successRate: 0,
    });
    expect(webhookHealth([])).toEqual({
      state: 'too_few',
      n: 0,
      successRate: null,
      p95Ms: null,
      lastSuccessAt: null,
      failingSince: null,
    });
  });

  it('is down once the last 5 attempts failed, failing since the first of the run', () => {
    expect(webhookHealth(deliveries('PPPPPSS'))).toEqual({
      state: 'down',
      n: 7,
      successRate: 28.57142857142857,
      p95Ms: 700,
      lastSuccessAt: at(55),
      failingSince: at(56),
    });
  });

  it('counts every attempt of a delivery that failed for good', () => {
    const [failed] = deliveries('F');
    expect(webhookHealth([{ ...failed, attempts: 6 }])).toMatchObject({
      state: 'down',
      n: 6,
      successRate: 0,
    });
  });

  it('counts the failed attempts of a delivery that finally succeeded', () => {
    const [retried] = deliveries('S');
    expect(webhookHealth([{ ...retried, attempts: 3 }])).toMatchObject({
      n: 3,
      successRate: 33.33333333333333,
    });
  });

  it('is degraded while retries are pending, before the failing run passes 4', () => {
    expect(webhookHealth(deliveries('PPPSSSSSSS'))).toMatchObject({
      state: 'degraded',
      n: 10,
      successRate: 70,
      failingSince: null,
    });
  });

  it('is degraded under 95 % success, ok from it', () => {
    const mostly = (failed: number) =>
      deliveries(`${'S'.repeat(20 - failed)}${'F'.repeat(failed)}`);

    expect(webhookHealth(mostly(2))).toMatchObject({
      state: 'degraded',
      successRate: 90,
      failingSince: null,
    });
    expect(webhookHealth(mostly(1))).toMatchObject({
      state: 'ok',
      successRate: 95,
      lastSuccessAt: at(60),
    });
  });
});
