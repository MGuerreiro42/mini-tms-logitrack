import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Optional } from '@nestjs/common';
import { PrismaHealthIndicator } from '@nestjs/terminus';
import type { Queue } from 'bullmq';
import { WebhookDeliveryStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { percentage, percentile } from '../../shared/stats/stats';
import { RedisHealthIndicator } from '../health/redis.health';
import { WEBHOOKS_QUEUE } from '../integrations/webhook-queue';
import { DEMO_QUEUE } from '../simulator/simulator.constants';
import {
  type SocketCounts,
  TrackingPresence,
} from '../tracking/tracking-presence';
import type {
  PulseResponseDto,
  QueuePulseDto,
  SimulatorState,
  WebhookPulseDto,
} from './metrics/pulse-response.dto';

const MINUTE_MS = 60_000;
const EVENT_MINUTES = 15;
const WEBHOOK_WINDOW_MS = 60 * MINUTE_MS;
// Below the 5 s poll: with Redis down, BullMQ and the socket adapter wait instead of failing.
const PART_TIMEOUT_MS = 2_000;

// A part that fails or hangs answers its fallback instead of failing the whole pulse.
function settle<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), PART_TIMEOUT_MS);
  });
  const attempt = Promise.resolve()
    .then(work)
    .catch(() => fallback);
  return Promise.race([attempt, timeout]).finally(() => clearTimeout(timer));
}

// The simulator only drives shipments while someone watches (TrackingPresence.hasViewers).
function simulatorState(
  loaded: boolean,
  sockets: SocketCounts | null,
): SimulatorState | null {
  if (!loaded) return 'off';
  if (!sockets) return null;
  return sockets.internal + sockets.public > 0 ? 'running' : 'idle';
}

@Injectable()
export class PulseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presence: TrackingPresence,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
    @InjectQueue(WEBHOOKS_QUEUE) private readonly webhooksQueue: Queue,
    // Registered only when the simulator module is loaded (DEMO_SIMULATOR=true).
    @Optional() @InjectQueue(DEMO_QUEUE) private readonly demoQueue?: Queue,
  ) {}

  async pulse(now = new Date()): Promise<PulseResponseDto> {
    const [eventsPerMinute, sockets, webhooks, queues, database, redis] =
      await Promise.all([
        settle(() => this.eventsPerMinute(now), null),
        settle(() => this.presence.socketCounts(), null),
        settle(() => this.webhooks(now), null),
        this.queues(),
        settle(
          async () =>
            (await this.prismaHealth.pingCheck('database', this.prisma))
              .database.status === 'up',
          false,
        ),
        settle(
          async () =>
            (await this.redisHealth.pingCheck('redis')).redis.status === 'up',
          false,
        ),
      ]);

    return {
      eventsPerMinute,
      sockets,
      simulator: simulatorState(this.demoQueue !== undefined, sockets),
      webhooks,
      queues,
      services: { database, redis },
    };
  }

  private async eventsPerMinute(now: Date): Promise<number[]> {
    const start = now.getTime() - EVENT_MINUTES * MINUTE_MS;
    const events = await this.prisma.trackingEvent.findMany({
      where: { createdAt: { gte: new Date(start), lte: now } },
      select: { createdAt: true },
    });
    const perMinute = Array<number>(EVENT_MINUTES).fill(0);
    for (const { createdAt } of events) {
      const minute = Math.floor((createdAt.getTime() - start) / MINUTE_MS);
      perMinute[Math.min(minute, EVENT_MINUTES - 1)]++;
    }
    return perMinute;
  }

  private async webhooks(now: Date): Promise<WebhookPulseDto> {
    const deliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        createdAt: { gte: new Date(now.getTime() - WEBHOOK_WINDOW_MS) },
        status: {
          in: [WebhookDeliveryStatus.SUCCEEDED, WebhookDeliveryStatus.FAILED],
        },
      },
      select: { status: true, durationMs: true },
    });
    const succeeded = deliveries.filter(
      (delivery) => delivery.status === WebhookDeliveryStatus.SUCCEEDED,
    ).length;
    return {
      n: deliveries.length,
      successRate:
        deliveries.length > 0 ? percentage(succeeded, deliveries.length) : null,
      p95Ms: percentile(
        deliveries.flatMap(({ durationMs }) =>
          durationMs === null ? [] : [durationMs],
        ),
        95,
      ),
    };
  }

  private async queues(): Promise<QueuePulseDto[]> {
    const queues = [this.webhooksQueue, this.demoQueue].filter(
      (queue): queue is Queue => queue !== undefined,
    );
    const counts = await Promise.all(
      queues.map((queue) =>
        settle(async (): Promise<QueuePulseDto> => {
          const { waiting, failed } = await queue.getJobCounts(
            'waiting',
            'failed',
          );
          return { name: queue.name, waiting, failed };
        }, null),
      ),
    );
    return counts.filter((count): count is QueuePulseDto => count !== null);
  }
}
