import type { ShipmentActivity } from '../types';
import { groupActivity, newArrivals } from './activity-feed';

const event = (id: string): ShipmentActivity => ({
  id,
  shipmentId: `shipment-${id}`,
  trackingCode: 'TMS-ABC123',
  status: 'COLLECTED',
  city: 'Sorocaba',
  createdAt: '2026-11-03T12:00:00.000Z',
});

describe('newArrivals', () => {
  it('returns the events not on screen yet, newest first', () => {
    const shown = [event('2'), event('1')];
    const latest = [event('4'), event('3'), event('2'), event('1')];

    expect(newArrivals(shown, latest).map((e) => e.id)).toEqual(['4', '3']);
  });

  it('returns nothing when the feed is up to date', () => {
    const shown = [event('2'), event('1')];

    expect(newArrivals(shown, shown)).toEqual([]);
  });
});

describe('groupActivity', () => {
  const step = (
    id: string,
    shipmentId: string,
    status: ShipmentActivity['status'],
  ) => ({
    ...event(id),
    shipmentId,
    status,
  });

  it('keeps each shipment at its newest event, with the status it came from', () => {
    const groups = groupActivity(
      [
        step('5', 'a', 'IN_TRANSIT'),
        step('4', 'b', 'ACCEPTED'),
        step('3', 'a', 'COLLECTED'),
        step('2', 'a', 'ACCEPTED'),
        step('1', 'c', 'PENDING'),
      ],
      new Map(),
    );

    expect(groups.map((g) => [g.id, g.previousStatus, g.status])).toEqual([
      ['5', 'COLLECTED', 'IN_TRANSIT'],
      ['4', null, 'ACCEPTED'],
      ['1', null, 'PENDING'],
    ]);
  });

  it('shows at most 6 shipments', () => {
    const events = Array.from({ length: 9 }, (_, i) =>
      step(String(i), `s${i}`, 'PENDING'),
    );

    expect(groupActivity(events, new Map())).toHaveLength(6);
  });

  it('keeps the status a row came from after its older event leaves the batch', () => {
    const known = new Map();
    groupActivity(
      [step('5', 'a', 'IN_TRANSIT'), step('3', 'a', 'COLLECTED')],
      known,
    );

    const [row] = groupActivity([step('5', 'a', 'IN_TRANSIT')], known);

    expect(row.previousStatus).toBe('COLLECTED');
  });
});
