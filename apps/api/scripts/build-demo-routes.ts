// Developer script (spec 03, FR-002): geocodes each demo address, fetches its street route from the
// demo hub and writes it under src/modules/shipments/routes. Never runs at runtime or in CI.
// Run: pnpm tsx scripts/build-demo-routes.ts && pnpm lint, then import new files in routes.ts.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  distanceKm,
  LAST_MILE_KM,
  type LngLat,
} from '../src/modules/shipments/route-geometry';
import { type DemoRoute, routeKey } from '../src/modules/shipments/routes';
import {
  DEMO_ADDRESSES,
  DEMO_STATE,
} from '../src/modules/simulator/demo-dataset';

// Cajamar, on the Anhanguera: where the big São Paulo distribution centers sit.
const HUB: LngLat = [-46.835, -23.336];
const MAX_POINTS = 300;
// Nominatim's usage policy: at most one request per second, with an identifying User-Agent.
const NOMINATIM_GAP_MS = 1100;
const USER_AGENT =
  'mini-tms-demo-routes/1.0 (+https://github.com/MGuerreiro42/mini-tms-logitrack)';
const OUT_DIR = join(__dirname, '../src/modules/shipments/routes');
// Nominatim only matches the name as spelled in OpenStreetMap.
const OSM_STREET_NAMES: Record<string, string> = {
  'Rua XV de Novembro': 'Rua Quinze de Novembro',
};

interface Place {
  lat: string;
  lon: string;
  // [south, north, west, east]
  boundingbox: [string, string, string, string];
}

async function getJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    throw new Error(`${url.host} answered ${response.status} for ${url}`);
  }
  return response.json() as Promise<T>;
}

async function geocode(params: Record<string, string>): Promise<Place> {
  await sleep(NOMINATIM_GAP_MS);
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'br',
    ...params,
  }).toString();
  const [place] = await getJson<Place[]>(url);
  if (!place) {
    throw new Error(`Nominatim found nothing for ${JSON.stringify(params)}`);
  }
  return place;
}

async function fetchRoute(from: LngLat, to: LngLat): Promise<LngLat[]> {
  const url = new URL(
    `https://router.project-osrm.org/route/v1/driving/${from.join(',')};${to.join(',')}`,
  );
  url.search = 'overview=full&geometries=geojson';
  const body = await getJson<{
    code: string;
    routes: { geometry: { coordinates: LngLat[] } }[];
  }>(url);
  if (body.code !== 'Ok') throw new Error(`OSRM answered ${body.code}`);
  return body.routes[0].geometry.coordinates;
}

// Planar distance is fine at this scale: it only ranks points against a tolerance.
function offset([x, y]: LngLat, [x1, y1]: LngLat, [x2, y2]: LngLat): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length === 0) return Math.hypot(x - x1, y - y1);
  return Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / length;
}

function douglasPeucker(points: LngLat[], tolerance: number): LngLat[] {
  if (points.length < 3) return points;
  const first = points[0];
  const last = points[points.length - 1];
  let farthest = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const distance = offset(points[i], first, last);
    if (distance > farthest) {
      farthest = distance;
      index = i;
    }
  }
  if (farthest <= tolerance) return [first, last];
  return [
    ...douglasPeucker(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...douglasPeucker(points.slice(index), tolerance),
  ];
}

function simplify(points: LngLat[]): LngLat[] {
  let tolerance = 0.00001;
  let simplified = douglasPeucker(points, tolerance);
  while (simplified.length > MAX_POINTS) {
    tolerance *= 1.5;
    simplified = douglasPeucker(points, tolerance);
  }
  return simplified;
}

const round = (value: number, digits: number) => Number(value.toFixed(digits));
const toLngLat = (place: Place): LngLat => [
  Number(place.lon),
  Number(place.lat),
];

async function buildRoute(
  address: (typeof DEMO_ADDRESSES)[number],
): Promise<DemoRoute> {
  const key = routeKey(address);
  const home = await geocode({
    street: `${address.number} ${OSM_STREET_NAMES[address.street] ?? address.street}`,
    city: address.city,
    state: DEMO_STATE,
    country: 'Brasil',
  });
  const city = await geocode({
    city: address.city,
    state: DEMO_STATE,
    country: 'Brasil',
  });
  const destination = toLngLat(home);
  const points = simplify(await fetchRoute(HUB, destination)).map(
    ([lng, lat]): LngLat => [round(lng, 5), round(lat, 5)],
  );

  const [south, north, west, east] = city.boundingbox.map(Number);
  const splitIndex = points.findIndex(
    ([lng, lat]) => lat >= south && lat <= north && lng >= west && lng <= east,
  );
  if (splitIndex < 1) {
    throw new Error(
      `${key}: no route point enters ${address.city} after the hub`,
    );
  }
  const splitKm = distanceKm(points[splitIndex], destination);
  // The public map stops at the split; closer than the last-mile radius it would reveal the door.
  if (splitKm < LAST_MILE_KM) {
    throw new Error(
      `${key}: the split is ${splitKm.toFixed(2)} km from the address, under ${LAST_MILE_KM} km`,
    );
  }

  console.log(
    `${key} (${address.city}): ${points.length} points, split at ${splitIndex}, ${splitKm.toFixed(1)} km from the address`,
  );
  return {
    key,
    points,
    splitIndex,
    destination,
    city: address.city,
    cityCenter: [round(Number(city.lon), 2), round(Number(city.lat), 2)],
  };
}

async function main(): Promise<void> {
  for (const address of DEMO_ADDRESSES) {
    const route = await buildRoute(address);
    await writeFile(
      join(OUT_DIR, `${route.key}.json`),
      `${JSON.stringify(route)}\n`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
