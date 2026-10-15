import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  SHIPMENT_STATUS_CHANGED,
  type ShipmentStatusChangedEvent,
} from '../shipments/shipment-events';
import { PublicTrackingGateway } from './public-tracking.gateway';
import { TrackingGateway } from './tracking.gateway';
import {
  ADMIN_MONITORING_ROOM,
  carrierRoom,
  shipmentRoom,
  trackingRoom,
} from './tracking-rooms';

@Injectable()
export class TrackingListener {
  constructor(
    private readonly gateway: TrackingGateway,
    private readonly publicGateway: PublicTrackingGateway,
  ) {}

  @OnEvent(SHIPMENT_STATUS_CHANGED)
  handleShipmentStatusChanged(event: ShipmentStatusChangedEvent): void {
    this.gateway.server
      .to(shipmentRoom(event.shipmentId))
      .emit('shipment:updated', event);
    this.gateway.server
      .to(carrierRoom(event.carrierId))
      .emit('shipment:updated', event);
    this.gateway.server
      .to(ADMIN_MONITORING_ROOM)
      .emit('shipment:updated', event);

    // Minimal payload: public subscribers must not learn ids, addresses or names.
    this.publicGateway.server
      .to(trackingRoom(event.trackingCode))
      .emit('tracking:updated', {
        trackingCode: event.trackingCode,
        status: event.status,
      });
  }
}
