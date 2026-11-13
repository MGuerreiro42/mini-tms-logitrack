import { webhookHealth } from './webhook-health';

const at = (minute: number) => new Date(Date.UTC(2026, 0, 1, 12, minute));
// Newest first, as the service reads them.
const deliveries = (statuses: string) =>
  [...statuses].map((s, i) => ({
    status: s === 'S' ? ('SUCCEEDED' as const) : ('FAILED' as const),
    durationMs: (i + 1) * 100,
    updatedAt: at(60 - i),
  }));

describe('webhookHealth', () => {
  it('is too_few below 5 finished deliveries', () => {
    expect(webhookHealth(deliveries('FFFF'))).toMatchObject({
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

  it('is down once the last 5 failed, failing since the first of the run', () => {
    expect(webhookHealth(deliveries('FFFFFFSS'))).toEqual({
      state: 'down',
      n: 8,
      successRate: 25,
      p95Ms: 800,
      lastSuccessAt: at(54),
      failingSince: at(55),
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
