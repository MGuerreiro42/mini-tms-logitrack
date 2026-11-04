import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Redis } from 'ioredis';
import type { EnvConfig } from '../../shared/config/env.validation';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { REDIS_CLIENT } from '../../shared/redis/redis.module';
import type {
  WebhookInboxRequestDto,
  WebhookInboxResponseDto,
} from './dto/webhook-inbox-response.dto';
import {
  WEBHOOK_INBOX_RECEIVED,
  type WebhookInboxReceivedEvent,
} from './webhook-events';
import { verifyWebhook } from './webhook-signature';

export const WEBHOOK_INBOX_PATH = 'webhook-inbox';
const KEPT_REQUESTS = 50;
const KEPT_BODY_LENGTH = 2048;
const KEPT_ID_LENGTH = 256;
const INBOX_TTL_SECONDS = 7 * 24 * 60 * 60;

const requestsKey = (inboxId: string) => `webhook-inbox:${inboxId}:requests`;
const failingKey = (inboxId: string) => `webhook-inbox:${inboxId}:failing`;

@Injectable()
export class WebhookInboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly eventEmitter: EventEmitter2,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // PUBLIC_API_URL is an origin: a path on it would be dropped here.
  urlFor(inboxId: string): string {
    const origin = this.configService.get('PUBLIC_API_URL', { infer: true });
    return new URL(`/${WEBHOOK_INBOX_PATH}/${inboxId}`, origin).href;
  }

  // By path, not full URL: endpoints saved under an earlier PUBLIC_API_URL still reach their inbox.
  isInboxUrl(url: string, inboxId: string): boolean {
    return URL.parse(url)?.pathname === `/${WEBHOOK_INBOX_PATH}/${inboxId}`;
  }

  // Returns the status code the inbox answers with.
  async receive(
    inboxId: string,
    headers: Record<string, string | string[] | undefined>,
    body: string | Buffer,
  ): Promise<number> {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({
      where: { inboxId },
      select: { sellerId: true, secret: true },
    });
    if (!endpoint) {
      throw new NotFoundException('Inbox not found');
    }

    const failing = (await this.redis.exists(failingKey(inboxId))) === 1;
    const webhookId = headers['webhook-id'];
    const request: WebhookInboxRequestDto = {
      id: randomUUID(),
      receivedAt: new Date(),
      webhookId:
        typeof webhookId === 'string'
          ? webhookId.slice(0, KEPT_ID_LENGTH)
          : null,
      body: body.toString().slice(0, KEPT_BODY_LENGTH),
      signatureValid: verifyWebhook(endpoint.secret, headers, body),
      responseStatus: failing ? 500 : 200,
    };
    await this.redis
      .multi()
      .lpush(requestsKey(inboxId), JSON.stringify(request))
      .ltrim(requestsKey(inboxId), 0, KEPT_REQUESTS - 1)
      .expire(requestsKey(inboxId), INBOX_TTL_SECONDS)
      .exec();

    const event: WebhookInboxReceivedEvent = {
      sellerId: endpoint.sellerId,
      request,
    };
    this.eventEmitter.emit(WEBHOOK_INBOX_RECEIVED, event);
    return request.responseStatus;
  }

  async read(inboxId: string): Promise<WebhookInboxResponseDto> {
    const [requests, failing] = await Promise.all([
      this.redis.lrange(requestsKey(inboxId), 0, KEPT_REQUESTS - 1),
      this.redis.exists(failingKey(inboxId)),
    ]);
    return {
      failRequests: failing === 1,
      requests: requests.map(
        (raw) => JSON.parse(raw) as WebhookInboxRequestDto,
      ),
    };
  }

  async setFailing(inboxId: string, failing: boolean): Promise<void> {
    if (failing) {
      await this.redis.set(failingKey(inboxId), '1', 'EX', INBOX_TTL_SECONDS);
    } else {
      await this.redis.del(failingKey(inboxId));
    }
  }

  async clear(inboxIds: string[]): Promise<void> {
    if (inboxIds.length === 0) return;
    await this.redis.del(
      ...inboxIds.flatMap((id) => [requestsKey(id), failingKey(id)]),
    );
  }
}
