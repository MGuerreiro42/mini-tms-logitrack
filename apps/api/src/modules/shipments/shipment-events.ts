import type { ShipmentStatus } from '../../../generated/prisma/client';

export const SHIPMENT_STATUS_CHANGED = 'shipment.status-changed';

export interface ShipmentStatusChangedEvent {
  shipmentId: string;
  carrierId: string;
  sellerId: string;
  status: ShipmentStatus;
  trackingCode: string;
}
