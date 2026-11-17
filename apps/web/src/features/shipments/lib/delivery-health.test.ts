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
});
