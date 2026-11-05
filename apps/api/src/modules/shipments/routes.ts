import type { Shipment } from '../../../generated/prisma/client';
import type { LngLat } from './route-geometry';
import paulista from './routes/01310100-1000.json';
import augusta from './routes/01412000-2340.json';
import guarulhos from './routes/07011000-57.json';
import santos from './routes/11010150-88.json';
import saoJoseDosCampos from './routes/12242000-760.json';
import campinas from './routes/13070178-455.json';
import ribeiraoPreto from './routes/14010000-310.json';
import sorocaba from './routes/18078005-1200.json';

export interface DemoRoute {
  key: string;
  points: LngLat[];
  // First point inside the destination city: IN_TRANSIT ends here, OUT_FOR_DELIVERY starts.
  splitIndex: number;
  destination: LngLat;
  city: string;
  cityCenter: LngLat;
}

export const routeKey = (address: { zipCode: string; number: string }) =>
  `${address.zipCode.replace(/\D/g, '')}-${address.number.trim().toLowerCase()}`;

// Imported, not read from disk, so the build copies them next to the compiled loader.
const ROUTES = new Map(
  (
    [
      paulista,
      augusta,
      guarulhos,
      santos,
      saoJoseDosCampos,
      campinas,
      ribeiraoPreto,
      sorocaba,
    ] as DemoRoute[]
  ).map((route) => [route.key, route]),
);

export const findRoute = (
  shipment: Pick<Shipment, 'addressZipCode' | 'addressNumber'>,
): DemoRoute | null =>
  ROUTES.get(
    routeKey({
      zipCode: shipment.addressZipCode,
      number: shipment.addressNumber,
    }),
  ) ?? null;
