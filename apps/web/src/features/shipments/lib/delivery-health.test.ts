import { sellerMetrics } from '../components/overview/overview.fixtures';
import { deliveryHealth } from './delivery-health';

describe('deliveryHealth', () => {
  it('is Good, held back by on time, on the demo numbers', () => {
    expect(deliveryHealth(sellerMetrics())).toEqual({
      level: 'Good',
      heldBackBy: 'on time 91.3% (n=150)',
    });
  });

  it('takes the worst input and names the first one in that band', () => {
    const health = deliveryHealth(
      sellerMetrics({
        firstAttempt: { rate: 84, n: 100, failed: 10, returned: 6 },
        cancelled: 20,
      }),
    );

    expect(health).toEqual({
      level: 'Critical',
      heldBackBy: 'cancelled 11.1% (n=180)',
    });
  });

  it('holds no one back when every input is excellent', () => {
    const health = deliveryHealth(
      sellerMetrics({
        onTime: { n: 150, count: 147, rate: 98, trend: [] },
        firstAttempt: { rate: 99, n: 159, failed: 1, returned: 0 },
        cancelled: 0,
      }),
    );

    expect(health).toEqual({ level: 'Excellent', heldBackBy: null });
  });

  it('is still building below 10 deliveries', () => {
    expect(deliveryHealth(sellerMetrics({ delivered: 3 }))).toEqual({
      building: 3,
    });
  });

  describe('boundaries', () => {
    const excellent = {
      onTime: { n: 150, count: 147, rate: 98, trend: [] },
      firstAttempt: { rate: 99, n: 100, failed: 1, returned: 0 },
      shipments: 100,
      cancelled: 0,
    };

    it.each([
      [95, 'Excellent'],
      [94.9, 'Good'],
      [90, 'Good'],
      [89.9, 'Fair'],
      [85, 'Fair'],
      [84.9, 'Poor'],
      [80, 'Poor'],
      [79.9, 'Critical'],
    ])('reads an on-time rate of %s as %s', (rate, level) => {
      const health = deliveryHealth(
        sellerMetrics({
          ...excellent,
          onTime: { ...excellent.onTime, rate },
        }),
      );

      expect(health).toMatchObject({ level });
    });

    it.each([
      [2, 'Excellent'],
      [3, 'Good'],
      [4, 'Good'],
      [5, 'Fair'],
      [6, 'Fair'],
      [7, 'Poor'],
      [8, 'Poor'],
      [9, 'Critical'],
    ])('reads %s%% cancelled as %s', (cancelled, level) => {
      expect(
        deliveryHealth(sellerMetrics({ ...excellent, cancelled })),
      ).toMatchObject({ level });
    });

    it('builds at 9 deliveries and judges at 10', () => {
      expect(deliveryHealth(sellerMetrics({ delivered: 9 }))).toEqual({
        building: 9,
      });
      expect(deliveryHealth(sellerMetrics({ delivered: 10 }))).toHaveProperty(
        'level',
      );
    });

    it('names the earlier input of a tie: on time, first attempt, returns, cancelled', () => {
      const fair = { ...excellent.firstAttempt, rate: 88 };
      const heldBackBy = (overrides: Parameters<typeof sellerMetrics>[0]) => {
        const health = deliveryHealth(sellerMetrics(overrides));
        return 'heldBackBy' in health ? health.heldBackBy : null;
      };

      expect(
        heldBackBy({
          ...excellent,
          onTime: { ...excellent.onTime, rate: 88 },
          firstAttempt: fair,
          cancelled: 5,
        }),
      ).toMatch(/^on time /);
      expect(
        heldBackBy({ ...excellent, firstAttempt: fair, cancelled: 5 }),
      ).toMatch(/^first attempt /);
      expect(
        heldBackBy({
          ...excellent,
          firstAttempt: { ...excellent.firstAttempt, returned: 5 },
          cancelled: 5,
        }),
      ).toMatch(/^returns 5\.0%/);
      expect(heldBackBy({ ...excellent, cancelled: 5 })).toMatch(/^cancelled /);
    });
  });
});
