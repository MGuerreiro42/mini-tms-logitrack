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
