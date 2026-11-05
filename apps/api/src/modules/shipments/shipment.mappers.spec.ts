import type { DemoRoute } from './routes';
import {
  pickAddress,
  toLiveMapDto,
  toPublicLiveMapDto,
} from './shipment.mappers';

describe('pickAddress', () => {
  const address = {
    addressStreet: 'Av. Paulista',
    addressNumber: '1000',
    addressNeighborhood: 'Bela Vista',
    addressCity: 'São Paulo',
    addressState: 'SP',
    addressZipCode: '01310-100',
  };

  it('copies only the address fields', () => {
    expect(pickAddress({ ...address, id: 'x' } as typeof address)).toEqual({
      ...address,
      addressComplement: null,
    });
  });

  it('keeps a provided complement', () => {
    expect(
      pickAddress({ ...address, addressComplement: 'Apt 4' }).addressComplement,
    ).toBe('Apt 4');
  });
});

describe('live map mappers', () => {
  const route: DemoRoute = {
    key: '00000000-1',
    points: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
    splitIndex: 2,
    destination: [0, 3],
    city: 'Testville',
    cityCenter: [0, 2.5],
  };
  // About 110 km from the destination.
  const farAway = {
    lat: 2,
    lng: 0,
    heading: 0,
    recordedAt: new Date('2026-01-01T10:00:00Z'),
  };

  it('gives internal readers the full route, the address and the position', () => {
    expect(toLiveMapDto({ route, lastPosition: farAway })).toEqual({
      map: { route: route.points, splitIndex: 2, destination: [0, 3] },
      lastPosition: farAway,
    });
  });

  it('cuts the public route at the city and drops the address', () => {
    const { map } = toPublicLiveMapDto(
      { route, lastPosition: null },
      'IN_TRANSIT',
    );

    expect(map).toEqual({
      route: route.points.slice(0, 3),
      city: 'Testville',
      cityCenter: [0, 2.5],
    });
  });

  it('shows the position publicly only while it may be public', () => {
    const liveMap = { route, lastPosition: farAway };

    expect(toPublicLiveMapDto(liveMap, 'IN_TRANSIT').lastPosition).toBe(
      farAway,
    );
    expect(
      toPublicLiveMapDto(liveMap, 'OUT_FOR_DELIVERY').lastPosition,
    ).toBeNull();
  });

  it('has no map without a route', () => {
    expect(toLiveMapDto({ route: null, lastPosition: null }).map).toBeNull();
    expect(
      toPublicLiveMapDto({ route: null, lastPosition: farAway }, 'IN_TRANSIT'),
    ).toEqual({ map: null, lastPosition: null });
  });
});
