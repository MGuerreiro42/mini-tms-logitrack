import { ShipmentStatus } from '../../../generated/prisma/client';
import { ALLOWED_TRANSITIONS, isValidTransition } from './shipment-status.util';

const ALL_STATUSES = Object.values(ShipmentStatus);

describe('isValidTransition', () => {
  // Exhaustive over the full 9x9 matrix, not just the happy path — this is
  // the kind of real branching logic this project's tests hold to a full
  // coverage bar (see DESIGN.md's testing philosophy).
  for (const from of ALL_STATUSES) {
    for (const to of ALL_STATUSES) {
      const expected = ALLOWED_TRANSITIONS[from].includes(to);
      it(`${from} -> ${to} is ${expected ? 'allowed' : 'rejected'}`, () => {
        expect(isValidTransition(from, to)).toBe(expected);
      });
    }
  }

  it('never allows transitioning into PENDING or CANCELLED from anywhere', () => {
    for (const from of ALL_STATUSES) {
      expect(isValidTransition(from, ShipmentStatus.PENDING)).toBe(false);
      expect(isValidTransition(from, ShipmentStatus.CANCELLED)).toBe(false);
    }
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
