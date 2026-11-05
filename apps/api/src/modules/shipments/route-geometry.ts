import { ShipmentStatus } from '../../../generated/prisma/client';
import type { DemoRoute } from './routes';

// GeoJSON order, as OSRM returns it and map libraries expect it.
export type LngLat = [lng: number, lat: number];

export interface RoutePoint {
  lat: number;
  lng: number;
  heading: number;
}

// The public link never shows a point this close to the door (DESIGN.md § 15).
export const LAST_MILE_KM = 1.5;

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

export function distanceKm([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// Initial compass bearing from a to b, 0–360 clockwise from north.
function bearing([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dLng = toRadians(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

// The route up to the destination city: all the public link ever draws.
export const publicRoute = (route: DemoRoute): LngLat[] =>
  route.points.slice(0, route.splitIndex + 1);

export const segmentFor = (
  route: DemoRoute,
  status: ShipmentStatus,
): LngLat[] =>
  status === ShipmentStatus.OUT_FOR_DELIVERY
    ? route.points.slice(route.splitIndex)
    : publicRoute(route);

// The public link shows the vehicle only on the way to the city, never inside the last mile.
export const isPublicPosition = (
  route: DemoRoute | null,
  status: ShipmentStatus,
  position: Pick<RoutePoint, 'lat' | 'lng'>,
): boolean =>
  status === ShipmentStatus.IN_TRANSIT &&
  route !== null &&
  distanceKm([position.lng, position.lat], route.destination) >= LAST_MILE_KM;

interface Leg {
  from: LngLat;
  to: LngLat;
  km: number;
}

const along = ({ from, to }: Leg, t: number): RoutePoint => ({
  lng: from[0] + (to[0] - from[0]) * t,
  lat: from[1] + (to[1] - from[1]) * t,
  heading: bearing(from, to),
});

// The point at a fraction of the segment's length, heading along the leg it falls on.
export function pointAt(segment: LngLat[], progress: number): RoutePoint {
  const legs = segment
    .slice(1)
    .map((to, i) => ({ from: segment[i], to, km: distanceKm(segment[i], to) }))
    .filter((leg) => leg.km > 0);
  if (legs.length === 0) {
    const [lng, lat] = segment[0];
    return { lng, lat, heading: 0 };
  }

  const totalKm = legs.reduce((total, leg) => total + leg.km, 0);
  let remaining = Math.min(Math.max(progress, 0), 1) * totalKm;
  for (const leg of legs) {
    if (remaining <= leg.km) return along(leg, remaining / leg.km);
    remaining -= leg.km;
  }
  // Floating-point drift past the last leg: the end of the segment.
  return along(legs[legs.length - 1], 1);
}
