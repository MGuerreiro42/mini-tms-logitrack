import type { ShipmentStatus } from '@/types/status';
import { nextExpectedStatus, reachedStepIndex } from './shipment-progress';

const at = (status: ShipmentStatus, day: number) => ({
  status,
  createdAt: `2026-01-0${day}T00:00:00.000Z`,
});

describe('reachedStepIndex', () => {
  it('reads the step from the status alone when there are no events', () => {
    expect(reachedStepIndex('IN_TRANSIT')).toBe(3);
    expect(reachedStepIndex('CANCELLED', [])).toBe(0);
  });

  it('keeps the furthest happy-path step behind a failed or returned delivery', () => {
    const events = [
      at('PENDING', 1),
      at('ACCEPTED', 2),
      at('COLLECTED', 3),
      at('IN_TRANSIT', 4),
      at('OUT_FOR_DELIVERY', 5),
      at('FAILED_DELIVERY', 6),
    ];

    expect(reachedStepIndex('FAILED_DELIVERY', events)).toBe(4);
    expect(reachedStepIndex('RETURNED', [...events, at('RETURNED', 7)])).toBe(
      4,
    );
  });
});

describe('nextExpectedStatus', () => {
  it.each([
    ['PENDING', 'ACCEPTED'],
    ['OUT_FOR_DELIVERY', 'DELIVERED'],
    ['FAILED_DELIVERY', 'RETURNED'],
    ['DELIVERED', undefined],
    ['CANCELLED', undefined],
    ['RETURNED', undefined],
  ] as const)('expects %s to be followed by %s', (status, next) => {
    expect(nextExpectedStatus(status)).toBe(next);
  });
});
