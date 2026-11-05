import { DEMO_ADDRESSES } from '../simulator/demo-dataset';
import { distanceKm, LAST_MILE_KM } from './route-geometry';
import { findRoute, routeKey } from './routes';

const MAX_POINTS = 300;

describe('demo routes', () => {
  it('normalizes the zip code and the number into the key', () => {
    expect(routeKey({ zipCode: '01310-100', number: ' 12A ' })).toBe(
      '01310100-12a',
    );
  });

  it.each(DEMO_ADDRESSES)('has a route for $street, $number', (address) => {
    const route = findRoute({
      addressZipCode: address.zipCode,
      addressNumber: address.number,
    });

    expect(route?.city).toBe(address.city);
    expect(route?.points.length).toBeLessThanOrEqual(MAX_POINTS);
    expect(route?.splitIndex).toBeGreaterThan(0);
  });

  it.each(DEMO_ADDRESSES)(
    'splits $street, $number outside the last mile',
    (address) => {
      const route = findRoute({
        addressZipCode: address.zipCode,
        addressNumber: address.number,
      });
      if (!route) throw new Error('missing route');

      expect(
        distanceKm(route.points[route.splitIndex], route.destination),
      ).toBeGreaterThanOrEqual(LAST_MILE_KM);
    },
  );

  it('has no route for an address outside the demo', () => {
    expect(
      findRoute({ addressZipCode: '99999-999', addressNumber: '1' }),
    ).toBeNull();
  });
});
