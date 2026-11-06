import { randomUUID } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import type { Queue } from 'bullmq';
import {
  type Prisma,
  type WebhookDelivery,
  WebhookDeliveryStatus,
  type WebhookEndpoint,
  WebhookEvent,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { uniqueViolationTarget } from '../../shared/prisma/unique-violation';
import {
  SHIPMENT_UPDATED,
  type ShipmentUpdatedEvent,
} from '../shipments/shipment-events';
import { toWebhookDeliveryResponseDto } from './webhook.mappers';
import {
  WEBHOOK_DELIVERY_UPDATED,
  type WebhookDeliveryUpdatedEvent,
} from './webhook-events';
import { WebhookInboxService } from './webhook-inbox.service';
import {
  DELIVER_JOB,
  type DeliverJobData,
  MAX_ATTEMPTS,
  WEBHOOKS_QUEUE,
} from './webhook-queue';
import { generateWebhookSecret } from './webhook-signature';

export const WEBHOOK_EVENT_TYPE: Record<WebhookEvent, string> = {
  SHIPMENT_CREATED: 'shipment.created',
  SHIPMENT_STATUS_CHANGED: 'shipment.status_changed',
};

export const ALL_EVENTS = Object.values(WebhookEvent);

@Injectable()
export class WebhookDispatcher {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly inbox: WebhookInboxService,
    @InjectQueue(WEBHOOKS_QUEUE) private readonly queue: Queue<DeliverJobData>,
  ) {}

  @OnEvent(SHIPMENT_UPDATED)
  async handleShipmentUpdated(event: ShipmentUpdatedEvent): Promise<void> {
    const type =
      event.previousStatus === null
        ? WebhookEvent.SHIPMENT_CREATED
        : WebhookEvent.SHIPMENT_STATUS_CHANGED;
    const endpoint = await this.findOrCreateEndpoint(event.sellerId);
    if (!endpoint.active || !endpoint.events.includes(type)) return;

    await this.dispatch(endpoint.id, event.sellerId, type, {
      type: WEBHOOK_EVENT_TYPE[type],
      timestamp: new Date().toISOString(),
      data: {
        shipmentId: event.shipmentId,
        trackingCode: event.trackingCode,
        status: event.status,
        previousStatus: event.previousStatus,
      },
    });
  }

  // Every seller gets an active endpoint on their own test inbox, so deliveries show up at once.
  // An existing one is returned as is: a seller who disabled it keeps it disabled.
  async findOrCreateEndpoint(sellerId: string): Promise<WebhookEndpoint> {
    const existing = await this.prisma.webhookEndpoint.findUnique({
      where: { sellerId },
    });
    if (existing) return existing;

    const inboxId = randomUUID();
    try {
      return await this.prisma.webhookEndpoint.create({
        data: {
          sellerId,
          inboxId,
          url: this.inbox.urlFor(inboxId),
          events: ALL_EVENTS,
          secret: generateWebhookSecret(),
        },
      });
    } catch (error) {
      // A concurrent first event or visit created it first.
      if (!uniqueViolationTarget(error)) throw error;
      return this.prisma.webhookEndpoint.findUniqueOrThrow({
        where: { sellerId },
      });
    }
  }

  async dispatch(
    endpointId: string,
    sellerId: string,
    event: WebhookEvent,
    payload: Prisma.InputJsonValue,
  ): Promise<WebhookDelivery> {
    const delivery = await this.prisma.webhookDelivery.create({
      data: { endpointId, event, payload },
    });
    this.emitUpdated(sellerId, delivery);
    try {
      await this.queue.add(
        DELIVER_JOB,
        { deliveryId: delivery.id },
        {
          jobId: delivery.id,
          attempts: MAX_ATTEMPTS,
          backoff: { type: 'custom' },
          // The delivery log lives in Postgres; finished jobs only take Redis memory.
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    } catch (error) {
      // Without a job nothing would ever attempt it: show it failed, so the seller can replay it.
      const failed = await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: WebhookDeliveryStatus.FAILED,
          error: 'Could not enqueue',
        },
      });
      this.emitUpdated(sellerId, failed);
      throw error;
    }
    return delivery;
  }

  emitUpdated(sellerId: string, delivery: WebhookDelivery): void {
    const event: WebhookDeliveryUpdatedEvent = {
      sellerId,
      delivery: toWebhookDeliveryResponseDto(delivery),
    };
    this.eventEmitter.emit(WEBHOOK_DELIVERY_UPDATED, event);
  }
}
