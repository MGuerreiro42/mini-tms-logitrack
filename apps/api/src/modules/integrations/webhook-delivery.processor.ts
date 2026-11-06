import { request } from 'node:https';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  type Prisma,
  type WebhookDelivery,
  WebhookDeliveryStatus,
  type WebhookEndpoint,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { assertPublicHttpsUrl, publicOnlyLookup } from './ssrf';
import { WebhookDispatcher } from './webhook-dispatcher';
import { WebhookInboxService } from './webhook-inbox.service';
import {
  type DeliverJobData,
  MAX_ATTEMPTS,
  retryDelayMs,
  WEBHOOKS_QUEUE,
} from './webhook-queue';
import { signWebhook, type WebhookHeaders } from './webhook-signature';

const TIMEOUT_MS = 5_000;
// One slow receiver holds a slot for up to 5 s; the others keep delivering meanwhile.
const CONCURRENCY = 10;

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  if (error.name === 'AbortError') {
    return `No response within ${TIMEOUT_MS / 1000} s`;
  }
  return (error as NodeJS.ErrnoException).code ?? error.message;
}

@Processor(WEBHOOKS_QUEUE, {
  concurrency: CONCURRENCY,
  settings: {
    backoffStrategy: (failedAttempts: number) => retryDelayMs(failedAttempts),
  },
})
export class WebhookDeliveryProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inbox: WebhookInboxService,
    private readonly dispatcher: WebhookDispatcher,
  ) {
    super();
  }

  // Nest closes workers after disposing the socket adapter; a delivery finishing then emits into a closed Redis.
  onModuleDestroy(): Promise<void> {
    return this.worker.close();
  }

  async process(job: Job<DeliverJobData>): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: job.data.deliveryId },
      include: { endpoint: true },
    });
    // Gone after a demo reset, or already failed by disabling the endpoint: nothing left to deliver.
    if (delivery?.status !== WebhookDeliveryStatus.PENDING) return;

    const { endpoint } = delivery;
    if (!endpoint.active) {
      await this.record(delivery, endpoint.sellerId, {
        status: WebhookDeliveryStatus.FAILED,
        error: 'Endpoint disabled',
        nextAttemptAt: null,
      });
      return;
    }

    const attempt = job.attemptsMade + 1;
    const started = performance.now();
    let responseCode: number | null = null;
    let error: string | null = null;
    try {
      responseCode = await this.send(delivery, endpoint);
      if (responseCode < 200 || responseCode >= 300) {
        error = `HTTP ${responseCode}`;
      }
    } catch (cause) {
      error = describeError(cause);
    }
    const retrying = error !== null && attempt < MAX_ATTEMPTS;

    let status: WebhookDeliveryStatus = WebhookDeliveryStatus.FAILED;
    if (error === null) status = WebhookDeliveryStatus.SUCCEEDED;
    else if (retrying) status = WebhookDeliveryStatus.PENDING;
    await this.record(delivery, endpoint.sellerId, {
      status,
      attempts: attempt,
      responseCode,
      durationMs: Math.round(performance.now() - started),
      error,
      nextAttemptAt: retrying
        ? new Date(Date.now() + retryDelayMs(attempt))
        : null,
    });
    // Throwing hands the retry to BullMQ, which waits as the backoff strategy says.
    if (retrying) throw new Error(error ?? 'Delivery failed');
  }

  private send(
    delivery: WebhookDelivery,
    endpoint: WebhookEndpoint,
  ): Promise<number> {
    const body = JSON.stringify(delivery.payload);
    const headers = signWebhook(
      endpoint.secret,
      delivery.id,
      Math.floor(Date.now() / 1000),
      body,
    );
    // The test inbox lives in this API: deliver to it in-process instead of a request to ourselves.
    if (this.inbox.isInboxUrl(endpoint.url, endpoint.inboxId)) {
      return this.inbox.receive(endpoint.inboxId, { ...headers }, body);
    }
    return this.post(endpoint.url, headers, body);
  }

  private async post(
    url: string,
    headers: WebhookHeaders,
    body: string,
  ): Promise<number> {
    await assertPublicHttpsUrl(url);
    return new Promise((resolve, reject) => {
      const outgoing = request(
        url,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...headers },
          lookup: publicOnlyLookup,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
        // Only the status matters: redirects are not followed and the receiver's body is never read.
        (response) => {
          response.destroy();
          resolve(response.statusCode ?? 0);
        },
      );
      outgoing.on('error', reject);
      outgoing.end(body);
    });
  }

  // Only a delivery still PENDING is written: disabling the endpoint mid-attempt keeps its FAILED.
  private async record(
    delivery: WebhookDelivery,
    sellerId: string,
    data: Prisma.WebhookDeliveryUpdateInput,
  ): Promise<void> {
    const updated = await this.prisma.webhookDelivery.update({
      where: { id: delivery.id, status: WebhookDeliveryStatus.PENDING },
      data,
    });
    this.dispatcher.emitUpdated(sellerId, updated);
  }
}
