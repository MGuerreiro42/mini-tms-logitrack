import { ShipmentStatus } from '../../../generated/prisma/client';
import {
  distanceKm,
  type LngLat,
  pointAt,
  publicRoute,
  segmentFor,
} from './route-geometry';
import type { DemoRoute } from './routes';

// A right angle near the equator: 0.01° north, then 0.01° east.
const SEGMENT: LngLat[] = [
  [0, 0],
  [0, 0.01],
  [0.01, 0.01],
];

const ROUTE: DemoRoute = {
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

describe('distanceKm', () => {
  it('measures great-circle distance', () => {
    // One degree of latitude is about 111.2 km.
    expect(distanceKm([0, 0], [0, 1])).toBeCloseTo(111.19, 1);
    expect(distanceKm([10, 20], [10, 20])).toBe(0);
  });
});

describe('pointAt', () => {
  it('starts at the first point, heading along the first leg', () => {
    expect(pointAt(SEGMENT, 0)).toEqual({ lng: 0, lat: 0, heading: 0 });
  });

  it('ends at the last point, heading along the last leg', () => {
    const end = pointAt(SEGMENT, 1);

    expect(end.lng).toBeCloseTo(0.01, 10);
    expect(end.lat).toBeCloseTo(0.01, 10);
    expect(end.heading).toBeCloseTo(90, 1);
  });

  it('places a fraction by distance, not by point count', () => {
    const quarter = pointAt(SEGMENT, 0.25);

    expect(quarter.lng).toBe(0);
    expect(quarter.lat).toBeCloseTo(0.005, 4);
  });

  it('clamps progress outside 0–1', () => {
    expect(pointAt(SEGMENT, -1)).toEqual(pointAt(SEGMENT, 0));
    expect(pointAt(SEGMENT, 2)).toEqual(pointAt(SEGMENT, 1));
  });

  it('skips repeated points and survives a segment with no length', () => {
    expect(pointAt([[0, 0], [0, 0], ...SEGMENT.slice(1)], 0).heading).toBe(0);
    expect(pointAt([[5, 6]], 0.5)).toEqual({ lng: 5, lat: 6, heading: 0 });
  });
});

describe('route segments', () => {
  it('cuts the public route at the split point', () => {
    expect(publicRoute(ROUTE)).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
    ]);
  });

  it('drives IN_TRANSIT to the split and OUT_FOR_DELIVERY from it', () => {
    expect(segmentFor(ROUTE, ShipmentStatus.IN_TRANSIT)).toEqual(
      publicRoute(ROUTE),
    );
    expect(segmentFor(ROUTE, ShipmentStatus.OUT_FOR_DELIVERY)).toEqual([
      [0, 2],
      [0, 3],
    ]);
  });
});
