import type { ShipmentStatus } from '../../../generated/prisma/client';

export const SHIPMENT_STATUS_CHANGED = 'shipment.status-changed';

// Emitted by ShipmentsService after claim()/updateStatus() commit their
// transaction — TrackingListener is the (only, for now) consumer, fanning it
// out over the TrackingGateway's rooms. This is EventEmitterModule's first
// real consumer in the whole codebase (it's been globally registered since
// app.module.ts with nothing listening yet).
export interface ShipmentStatusChangedEvent {
  shipmentId: string;
  carrierId: string;
  sellerId: string;
  status: ShipmentStatus;
  trackingCode: string;
}
