import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  SHIPMENT_STATUS_CHANGED,
  type ShipmentStatusChangedEvent,
} from '../shipments/shipment-events';
import { TrackingGateway } from './tracking.gateway';

// Kept separate from the gateway, not an @OnEvent handler inline on it, so
// this fan-out logic is unit-testable against a mocked `server` without
// spinning up a real socket.
@Injectable()
export class TrackingListener {
  constructor(private readonly gateway: TrackingGateway) {}

  @OnEvent(SHIPMENT_STATUS_CHANGED)
  handleShipmentStatusChanged(event: ShipmentStatusChangedEvent): void {
    this.gateway.server
      .to(`shipment:${event.shipmentId}`)
      .emit('shipment:updated', event);
    this.gateway.server
      .to(`carrier:${event.carrierId}`)
      .emit('shipment:updated', event);
  }
}
