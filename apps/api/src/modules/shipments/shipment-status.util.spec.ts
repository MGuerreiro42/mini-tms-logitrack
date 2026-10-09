import { ShipmentStatus } from '../../../generated/prisma/client';
import {
  ALLOWED_TRANSITIONS,
  CANCELLABLE_STATUSES,
  isValidTransition,
} from './shipment-status.util';

const ALL_STATUSES = Object.values(ShipmentStatus);

describe('isValidTransition', () => {
  // Exhaustive over the full status matrix, not just the happy path.
  for (const from of ALL_STATUSES) {
    for (const to of ALL_STATUSES) {
      const expected = ALLOWED_TRANSITIONS[from].includes(to);
      it(`${from} -> ${to} is ${expected ? 'allowed' : 'rejected'}`, () => {
        expect(isValidTransition(from, to)).toBe(expected);
      });
    }
  }

  it('never allows transitioning into PENDING from anywhere', () => {
    for (const from of ALL_STATUSES) {
      expect(isValidTransition(from, ShipmentStatus.PENDING)).toBe(false);
    }
  });

  it('only PENDING and ACCEPTED can be cancelled', () => {
    expect(CANCELLABLE_STATUSES).toEqual([
      ShipmentStatus.PENDING,
      ShipmentStatus.ACCEPTED,
    ]);
  });

  it('CANCELLED is terminal', () => {
    expect(ALLOWED_TRANSITIONS[ShipmentStatus.CANCELLED]).toEqual([]);
  });

  it('DELIVERED and RETURNED are terminal', () => {
    expect(ALLOWED_TRANSITIONS[ShipmentStatus.DELIVERED]).toEqual([]);
    expect(ALLOWED_TRANSITIONS[ShipmentStatus.RETURNED]).toEqual([]);
  });

  it('OUT_FOR_DELIVERY branches into DELIVERED or FAILED_DELIVERY', () => {
    expect(ALLOWED_TRANSITIONS[ShipmentStatus.OUT_FOR_DELIVERY]).toEqual([
      ShipmentStatus.DELIVERED,
      ShipmentStatus.FAILED_DELIVERY,
    ]);
  });
});
