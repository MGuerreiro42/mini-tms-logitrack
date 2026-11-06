import type { LngLat } from '../types';

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;
const normalize = (deg: number) => ((deg % 360) + 360) % 360;

export function lerpLngLat(from: LngLat, to: LngLat, t: number): LngLat {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
}

// Initial great-circle bearing, clockwise from north.
export function bearingDeg(from: LngLat, to: LngLat): number {
  const [lng1, lat1] = [toRad(from[0]), toRad(from[1])];
  const [lng2, lat2] = [toRad(to[0]), toRad(to[1])];
  const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
  return normalize(toDeg(Math.atan2(y, x)));
}

// Turns the short way round, so 350° → 10° passes through north.
export function lerpAngle(from: number, to: number, t: number): number {
  const delta = ((to - from + 540) % 360) - 180;
  return normalize(from + delta * t);
}

export function nearestIndex(route: LngLat[], point: LngLat): number {
  // Equirectangular distance is enough to rank vertices a few km apart.
  const scale = Math.cos(toRad(point[1]));
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  route.forEach(([lng, lat], index) => {
    const distance = ((lng - point[0]) * scale) ** 2 + (lat - point[1]) ** 2;
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

export function isNewer(
  next: { recordedAt: string },
  current: { recordedAt: string } | null | undefined,
): boolean {
  return (
    !current || Date.parse(next.recordedAt) > Date.parse(current.recordedAt)
  );
}
