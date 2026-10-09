import type { ShipmentStatus } from '../../../generated/prisma/client';

export const SHIPMENT_STATUS_CHANGED = 'shipment.status-changed';

// Emitted after each status write commits; TrackingListener fans it out to socket rooms.
export interface ShipmentStatusChangedEvent {
  shipmentId: string;
  carrierId: string;
  sellerId: string;
  status: ShipmentStatus;
  trackingCode: string;
}
