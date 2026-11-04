import type { ShipmentActivity } from '../types';
import { newArrivals } from './activity-feed';

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
