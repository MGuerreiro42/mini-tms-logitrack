import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  WEBHOOK_DELIVERY_UPDATED,
  WEBHOOK_INBOX_RECEIVED,
  type WebhookDeliveryUpdatedEvent,
  type WebhookInboxReceivedEvent,
} from '../integrations/webhook-events';
import {
  SHIPMENT_UPDATED,
  type ShipmentUpdatedEvent,
  VEHICLE_POSITION_REPORTED,
  type VehiclePositionReportedEvent,
} from '../shipments/shipment-events';
import { DEMO_RESET } from '../simulator/demo-events';
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

  @OnEvent(VEHICLE_POSITION_REPORTED)
  handlePositionReported(event: VehiclePositionReportedEvent): void {
    const { shipmentId, trackingCode, status, lat, lng, heading, recordedAt } =
      event;
    this.gateway.server
      .to([
        shipmentRoom(shipmentId),
        carrierRoom(event.carrierId),
        sellerRoom(event.sellerId),
      ])
      .emit('tracking:position', {
        shipmentId,
        trackingCode,
        status,
        lat,
        lng,
        heading,
        recordedAt,
      });

    if (!event.publiclyVisible) return;
    this.publicGateway.server
      .to(trackingRoom(trackingCode))
      .emit('tracking:position', {
        trackingCode,
        lat,
        lng,
        heading,
        recordedAt,
      });
  }

  @OnEvent(WEBHOOK_DELIVERY_UPDATED)
  handleWebhookDelivery({
    sellerId,
    delivery,
  }: WebhookDeliveryUpdatedEvent): void {
    this.gateway.server
      .to(sellerRoom(sellerId))
      .emit('webhook:delivery', delivery);
  }

  @OnEvent(WEBHOOK_INBOX_RECEIVED)
  handleWebhookInbox({ sellerId, request }: WebhookInboxReceivedEvent): void {
    this.gateway.server.to(sellerRoom(sellerId)).emit('webhook:inbox', request);
  }

  @OnEvent(DEMO_RESET)
  handleDemoReset(): void {
    this.gateway.server.emit('demo:reset');
    this.publicGateway.server.emit('demo:reset');
  }
}
