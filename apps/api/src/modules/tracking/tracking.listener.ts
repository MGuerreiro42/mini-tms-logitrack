import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  SHIPMENT_UPDATED,
  type ShipmentUpdatedEvent,
} from '../shipments/shipment-events';
import { PublicTrackingGateway } from './public-tracking.gateway';
import { TrackingGateway } from './tracking.gateway';
import {
  ADMIN_MONITORING_ROOM,
  carrierRoom,
  sellerRoom,
  shipmentRoom,
  trackingRoom,
} from './tracking-rooms';

@Injectable()
export class TrackingListener {
  constructor(
    private readonly gateway: TrackingGateway,
    private readonly publicGateway: PublicTrackingGateway,
  ) {}

  @OnEvent(SHIPMENT_UPDATED)
  handleShipmentUpdated(event: ShipmentUpdatedEvent): void {
    // One broadcast over the union of rooms: a socket in several of them gets the event once.
    this.gateway.server
      .to([
        shipmentRoom(event.shipmentId),
        carrierRoom(event.carrierId),
        sellerRoom(event.sellerId),
        ADMIN_MONITORING_ROOM,
      ])
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
