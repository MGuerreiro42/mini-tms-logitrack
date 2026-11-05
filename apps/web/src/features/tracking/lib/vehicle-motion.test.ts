import {
  bearingDeg,
  isNewer,
  lerpAngle,
  lerpLngLat,
  nearestIndex,
} from './vehicle-motion';

describe('lerpLngLat', () => {
  it('returns the endpoints at 0 and 1 and the midpoint at 0.5', () => {
    expect(lerpLngLat([-46, -23], [-47, -24], 0)).toEqual([-46, -23]);
    expect(lerpLngLat([-46, -23], [-47, -24], 1)).toEqual([-47, -24]);
    expect(lerpLngLat([-46, -23], [-47, -24], 0.5)).toEqual([-46.5, -23.5]);
  });
});

describe('bearingDeg', () => {
  it.each([
    ['north', [0, 1], 0],
    ['east', [1, 0], 90],
    ['south', [0, -1], 180],
    ['west', [-1, 0], 270],
  ] as const)('points %s', (_, to, expected) => {
    expect(bearingDeg([0, 0], [...to])).toBeCloseTo(expected, 5);
  });
});

describe('lerpAngle', () => {
  it('interpolates directly when no wrap is shorter', () => {
    expect(lerpAngle(10, 50, 0.5)).toBeCloseTo(30);
  });

  it('crosses north instead of turning the long way', () => {
    expect(lerpAngle(350, 10, 0.5)).toBeCloseTo(0);
    expect(lerpAngle(10, 350, 0.25)).toBeCloseTo(5);
  });

  it('lands on the target at 1', () => {
    expect(lerpAngle(270, 90, 1)).toBeCloseTo(90);
  });
});

describe('nearestIndex', () => {
  const route: [number, number][] = [
    [-46.9, -23.3],
    [-46.8, -23.4],
    [-46.7, -23.5],
  ];

  it('picks the closest vertex', () => {
    expect(nearestIndex(route, [-46.79, -23.41])).toBe(1);
    expect(nearestIndex(route, [-46.6, -23.6])).toBe(2);
  });
});

describe('isNewer', () => {
  const at = (recordedAt: string) => ({ recordedAt });

  it('treats any position as newer than none', () => {
    expect(isNewer(at('2026-01-01T00:00:00Z'), null)).toBe(true);
    expect(isNewer(at('2026-01-01T00:00:00Z'), undefined)).toBe(true);
  });

  it('compares by recordedAt, rejecting equal and older ones', () => {
    const current = at('2026-01-01T00:00:02Z');
    expect(isNewer(at('2026-01-01T00:00:03Z'), current)).toBe(true);
    expect(isNewer(at('2026-01-01T00:00:02.000Z'), current)).toBe(false);
    expect(isNewer(at('2026-01-01T00:00:01Z'), current)).toBe(false);
  });
});
