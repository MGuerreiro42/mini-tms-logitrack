import type { ShipmentStatus, TimelineEvent } from '@/types/status';

export interface TrackingUpdatedEvent {
  trackingCode: string;
  status: ShipmentStatus;
}

export interface PublicTracking {
  trackingCode: string;
  status: ShipmentStatus;
  addressCity: string;
  addressState: string;
  modalityName: string;
  events: TimelineEvent[];
}
