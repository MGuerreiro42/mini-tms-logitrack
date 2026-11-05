import { DEMO_ADDRESSES, DEMO_SELLERS } from '../simulator/demo-dataset';
import { distanceKm, LAST_MILE_KM } from './route-geometry';
import { findRoute, routeKey } from './routes';

const MAX_POINTS = 300;

const demoShipment = (address: { zipCode: string; number: string }) => ({
  addressZipCode: address.zipCode,
  addressNumber: address.number,
  seller: { user: { email: DEMO_SELLERS[0].email } },
});

describe('demo routes', () => {
  it('normalizes the zip code and the number into the key', () => {
    expect(routeKey({ zipCode: '01310-100', number: ' 12A ' })).toBe(
      '01310100-12a',
    );
  });

  it.each(DEMO_ADDRESSES)('has a route for $street, $number', (address) => {
    const route = findRoute(demoShipment(address));

    expect(route?.city).toBe(address.city);
    expect(route?.points.length).toBeLessThanOrEqual(MAX_POINTS);
    expect(route?.splitIndex).toBeGreaterThan(0);
  });

  it.each(DEMO_ADDRESSES)(
    'splits $street, $number outside the last mile',
    (address) => {
      const route = findRoute(demoShipment(address));
      if (!route) throw new Error('missing route');

      expect(
        distanceKm(route.points[route.splitIndex], route.destination),
      ).toBeGreaterThanOrEqual(LAST_MILE_KM);
    },
  );

  it('has no route for an address outside the demo', () => {
    expect(
      findRoute(demoShipment({ zipCode: '99999-999', number: '1' })),
    ).toBeNull();
  });

  it('has no route for a seller outside the demo, even at a demo address', () => {
    const shipment = demoShipment(DEMO_ADDRESSES[0]);

    expect(
      findRoute({ ...shipment, seller: { user: { email: 'real@shop.com' } } }),
    ).toBeNull();
  });
});
