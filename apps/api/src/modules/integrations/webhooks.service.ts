import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type WebhookDeliveryStatus,
  type WebhookEndpoint,
  WebhookEvent,
} from '../../../generated/prisma/client';
import {
  type PaginatedResult,
  paginate,
} from '../../shared/pagination/pagination-meta.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { UpdateWebhookEndpointDto } from './dto/update-webhook-endpoint.dto';
import type { WebhookDeliveryResponseDto } from './dto/webhook-delivery-response.dto';
import type { WebhookEndpointResponseDto } from './dto/webhook-endpoint-response.dto';
import type { WebhookInboxResponseDto } from './dto/webhook-inbox-response.dto';
import { assertPublicHttpsUrl, UnsafeWebhookUrlError } from './ssrf';
import {
  toWebhookDeliveryResponseDto,
  toWebhookEndpointResponseDto,
} from './webhook.mappers';
import { WebhookDispatcher } from './webhook-dispatcher';
import { WebhookInboxService } from './webhook-inbox.service';
import { generateWebhookSecret } from './webhook-signature';

const ALL_EVENTS = Object.values(WebhookEvent);

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inbox: WebhookInboxService,
    private readonly dispatcher: WebhookDispatcher,
  ) {}

  async getEndpoint(userId: string): Promise<WebhookEndpointResponseDto> {
    return this.toResponse(await this.findOrCreateEndpoint(userId));
  }

  async updateEndpoint(
    userId: string,
    dto: UpdateWebhookEndpointDto,
  ): Promise<WebhookEndpointResponseDto> {
    const endpoint = await this.findOrCreateEndpoint(userId);
    if (
      dto.url !== undefined &&
      dto.url !== this.inbox.urlFor(endpoint.inboxId)
    ) {
      await assertPublicHttpsUrl(dto.url).catch((error: unknown) => {
        throw error instanceof UnsafeWebhookUrlError
          ? new BadRequestException(error.message)
          : error;
      });
    }

    const updated = await this.prisma.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: { url: dto.url, events: dto.events, active: dto.active },
    });
    if (dto.active === false) {
      await this.prisma.webhookDelivery.updateMany({
        where: { endpointId: endpoint.id, status: 'PENDING' },
        data: {
          status: 'FAILED',
          error: 'Endpoint disabled',
          nextAttemptAt: null,
        },
      });
    }
    return this.toResponse(updated);
  }

  async rotateSecret(userId: string): Promise<WebhookEndpointResponseDto> {
    const endpoint = await this.findOrCreateEndpoint(userId);
    const updated = await this.prisma.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: { secret: generateWebhookSecret() },
    });
    return this.toResponse(updated);
  }

  async findDeliveries(
    userId: string,
    status: WebhookDeliveryStatus | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<WebhookDeliveryResponseDto>> {
    const where = {
      endpoint: { seller: { userId } },
      ...(status ? { status } : {}),
    };
    const [deliveries, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.webhookDelivery.count({ where }),
    ]);
    return paginate(
      deliveries.map(toWebhookDeliveryResponseDto),
      total,
      page,
      limit,
    );
  }

  async replay(
    userId: string,
    deliveryId: string,
  ): Promise<WebhookDeliveryResponseDto> {
    const original = await this.prisma.webhookDelivery.findFirst({
      where: { id: deliveryId, endpoint: { seller: { userId } } },
      include: { endpoint: { select: { sellerId: true } } },
    });
    if (!original) {
      throw new NotFoundException('Delivery not found');
    }

    const delivery = await this.dispatcher.dispatch(
      original.endpointId,
      original.endpoint.sellerId,
      original.event,
      original.payload ?? {},
    );
    return toWebhookDeliveryResponseDto(delivery);
  }

  async readInbox(userId: string): Promise<WebhookInboxResponseDto> {
    const endpoint = await this.findOrCreateEndpoint(userId);
    return this.inbox.read(endpoint.inboxId);
  }

  async setInboxFailing(
    userId: string,
    failing: boolean,
  ): Promise<WebhookInboxResponseDto> {
    const endpoint = await this.findOrCreateEndpoint(userId);
    await this.inbox.setFailing(endpoint.inboxId, failing);
    return this.inbox.read(endpoint.inboxId);
  }

  // Every seller starts with an active endpoint on their own test inbox, so deliveries show up at once.
  private async findOrCreateEndpoint(userId: string): Promise<WebhookEndpoint> {
    const seller = await this.prisma.seller.findUnique({
      where: { userId },
      include: { webhookEndpoint: true },
    });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }
    if (seller.webhookEndpoint) return seller.webhookEndpoint;

    const inboxId = randomUUID();
    // upsert: two first visits at once must not race into a unique violation.
    return this.prisma.webhookEndpoint.upsert({
      where: { sellerId: seller.id },
      update: {},
      create: {
        sellerId: seller.id,
        inboxId,
        url: this.inbox.urlFor(inboxId),
        events: ALL_EVENTS,
        secret: generateWebhookSecret(),
      },
    });
  }

  private toResponse(endpoint: WebhookEndpoint): WebhookEndpointResponseDto {
    return toWebhookEndpointResponseDto(
      endpoint,
      this.inbox.urlFor(endpoint.inboxId),
    );
  }
}
