import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Optional } from '@nestjs/common';
import { PrismaHealthIndicator } from '@nestjs/terminus';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { percentage } from '../../shared/stats/stats';
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
} from './dto/pulse-response.dto';
import { RedisHealthIndicator } from './redis.health';

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
    // Exported by the simulator module, which is only loaded with DEMO_SIMULATOR=true.
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

  // Counted per minute in Postgres, on the createdAt index; the oldest minute comes first.
  private async eventsPerMinute(now: Date): Promise<number[]> {
    const start = new Date(now.getTime() - EVENT_MINUTES * MINUTE_MS);
    const minutes = await this.prisma.$queryRaw<
      { minute: number; n: number }[]
    >`
      SELECT floor((extract(epoch FROM "createdAt") * 1000 - ${start.getTime()}) / ${MINUTE_MS})::int AS minute,
             count(*)::int AS n
      FROM "TrackingEvent"
      WHERE "createdAt" >= ${start} AND "createdAt" <= ${now}
      GROUP BY 1`;
    const perMinute = Array<number>(EVENT_MINUTES).fill(0);
    // An event at exactly now falls one past the last minute; it belongs to it.
    for (const { minute, n } of minutes) {
      perMinute[Math.min(minute, EVENT_MINUTES - 1)] += n;
    }
    return perMinute;
  }

  // percentile_disc is the nearest rank, as every percentile of the metrics core.
  private async webhooks(now: Date): Promise<WebhookPulseDto> {
    const since = new Date(now.getTime() - WEBHOOK_WINDOW_MS);
    const [row] = await this.prisma.$queryRaw<
      { n: number; succeeded: number; p95: number | null }[]
    >`
      SELECT count(*)::int AS n,
             (count(*) FILTER (WHERE status = 'SUCCEEDED'))::int AS succeeded,
             percentile_disc(0.95) WITHIN GROUP (ORDER BY "durationMs") AS p95
      FROM "WebhookDelivery"
      WHERE "createdAt" >= ${since} AND status IN ('SUCCEEDED', 'FAILED')`;
    return {
      n: row.n,
      successRate: row.n > 0 ? percentage(row.succeeded, row.n) : null,
      p95Ms: row.p95,
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
