import type { ShipmentStatus } from '@/features/shipments/types';

export interface PublicTrackingEvent {
  status: ShipmentStatus;
  createdAt: string;
}

export interface PublicTracking {
  trackingCode: string;
  status: ShipmentStatus;
  addressCity: string;
  addressState: string;
  modalityName: string;
  events: PublicTrackingEvent[];
}
