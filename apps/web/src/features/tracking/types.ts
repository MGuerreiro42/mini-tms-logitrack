import type { ShipmentStatus, TimelineEvent } from '@/types/status';

export interface TrackingUpdatedEvent {
  trackingCode: string;
  status: ShipmentStatus;
}

// Routes come as GeoJSON-ordered [lng, lat] pairs; positions as { lat, lng } objects.
export type LngLat = [lng: number, lat: number];

export interface LastPosition {
  lat: number;
  lng: number;
  heading: number | null;
  recordedAt: string;
}

export interface PositionEvent extends LastPosition {
  trackingCode: string;
}

export type MapStage = 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DONE';

interface DeliveryMapBase {
  route: LngLat[] | null;
  stage: MapStage;
  position: LastPosition | null;
  label: string;
  caption: string;
}

// Seller and carrier: the route to the door and the address pin.
interface InternalDeliveryMap extends DeliveryMapBase {
  splitIndex?: number;
  destination?: LngLat;
  area?: never;
}

// Public link: the route stops at the city, shown as a halo around its center, never a pin.
interface PublicDeliveryMap extends DeliveryMapBase {
  area: { center: LngLat };
  splitIndex?: never;
  destination?: never;
}

export type DeliveryMapProps = InternalDeliveryMap | PublicDeliveryMap;

export interface PublicTrackingMap {
  route: LngLat[];
  city: string;
  cityCenter: LngLat;
}

export interface PublicTracking {
  trackingCode: string;
  status: ShipmentStatus;
  addressCity: string;
  addressState: string;
  modalityName: string;
  events: TimelineEvent[];
  map: PublicTrackingMap | null;
  lastPosition: LastPosition | null;
}
