import type { ShipmentStatus } from '../../../generated/prisma/client';

export const SHIPMENT_UPDATED = 'shipment.updated';

export interface ShipmentUpdatedEvent {
  shipmentId: string;
  carrierId: string;
  sellerId: string;
  status: ShipmentStatus;
  // null when the shipment was just created.
  previousStatus: ShipmentStatus | null;
  trackingCode: string;
}

export const VEHICLE_POSITION_REPORTED = 'shipment.position-reported';

export interface VehiclePositionReportedEvent {
  shipmentId: string;
  carrierId: string;
  sellerId: string;
  trackingCode: string;
  status: ShipmentStatus;
  lat: number;
  lng: number;
  heading: number | null;
  recordedAt: Date;
  // Decided where the shipment's address is known, so the listener never sees it.
  publiclyVisible: boolean;
}
