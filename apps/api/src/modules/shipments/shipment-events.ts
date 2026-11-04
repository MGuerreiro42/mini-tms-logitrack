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
