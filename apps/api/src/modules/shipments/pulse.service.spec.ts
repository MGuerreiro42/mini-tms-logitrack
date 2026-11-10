import type { PrismaHealthIndicator } from '@nestjs/terminus';
import type { Queue } from 'bullmq';
import type { PrismaService } from '../../shared/prisma/prisma.service';
import type { RedisHealthIndicator } from '../health/redis.health';
import type { TrackingPresence } from '../tracking/tracking-presence';
import { PulseService } from './pulse.service';

const NOW = new Date('2026-11-10T12:00:00Z');
const minutesAgo = (minutes: number) =>
  new Date(NOW.getTime() - minutes * 60_000);

describe('PulseService', () => {
  const trackingEvents = vi.fn();
  const webhookDeliveries = vi.fn();
  const socketCounts = vi.fn();
  const databasePing = vi.fn();
  const redisPing = vi.fn();
  const queue = (name: string, getJobCounts = vi.fn()) =>
    ({ name, getJobCounts }) as unknown as Queue;

  const service = (demoQueue?: Queue, webhooksQueue = queue('webhooks')) =>
    new PulseService(
      {
        trackingEvent: { findMany: trackingEvents },
        webhookDelivery: { findMany: webhookDeliveries },
      } as unknown as PrismaService,
      { socketCounts } as unknown as TrackingPresence,
      { pingCheck: databasePing } as unknown as PrismaHealthIndicator,
      { pingCheck: redisPing } as unknown as RedisHealthIndicator,
      webhooksQueue,
      demoQueue,
    );

  beforeEach(() => {
    trackingEvents.mockResolvedValue([]);
    webhookDeliveries.mockResolvedValue([]);
    socketCounts.mockResolvedValue({ internal: 0, public: 0 });
    databasePing.mockResolvedValue({ database: { status: 'up' } });
    redisPing.mockResolvedValue({ redis: { status: 'up' } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts tracking events per minute, oldest first', async () => {
    trackingEvents.mockResolvedValue([
      { createdAt: minutesAgo(15) },
      { createdAt: minutesAgo(14.5) },
      { createdAt: minutesAgo(0.5) },
      { createdAt: NOW },
    ]);

    const { eventsPerMinute } = await service().pulse(NOW);

    expect(eventsPerMinute).toEqual([2, ...Array(13).fill(0), 2]);
  });

  it('rates finished webhooks of the last hour, null without any', async () => {
    expect((await service().pulse(NOW)).webhooks).toEqual({
      n: 0,
      successRate: null,
      p95Ms: null,
    });

    webhookDeliveries.mockResolvedValue([
      { status: 'SUCCEEDED', durationMs: 100 },
      { status: 'SUCCEEDED', durationMs: 300 },
      { status: 'SUCCEEDED', durationMs: null },
      { status: 'FAILED', durationMs: 900 },
    ]);
    expect((await service().pulse(NOW)).webhooks).toEqual({
      n: 4,
      successRate: 75,
      p95Ms: 900,
    });
  });

  it('reads the simulator off and lists no demo queue without it', async () => {
    const webhooks = queue(
      'webhooks',
      vi.fn().mockResolvedValue({ waiting: 2, failed: 1 }),
    );

    const pulse = await service(undefined, webhooks).pulse(NOW);

    expect(pulse.simulator).toBe('off');
    expect(pulse.queues).toEqual([{ name: 'webhooks', waiting: 2, failed: 1 }]);
  });

  it.each([
    [{ internal: 1, public: 0 }, 'running'],
    [{ internal: 0, public: 0 }, 'idle'],
  ])(
    'reads a loaded simulator with sockets %o as %s',
    async (sockets, state) => {
      socketCounts.mockResolvedValue(sockets);
      const demo = queue(
        'demo',
        vi.fn().mockResolvedValue({ waiting: 0, failed: 3 }),
      );

      const pulse = await service(demo).pulse(NOW);

      expect(pulse.simulator).toBe(state);
      expect(pulse.queues).toContainEqual({
        name: 'demo',
        waiting: 0,
        failed: 3,
      });
    },
  );

  it('degrades each failing part on its own', async () => {
    trackingEvents.mockRejectedValue(new Error('db down'));
    socketCounts.mockRejectedValue(new Error('adapter down'));
    databasePing.mockResolvedValue({ database: { status: 'down' } });
    redisPing.mockRejectedValue(new Error('redis down'));

    const pulse = await service(
      queue('demo', vi.fn().mockRejectedValue(new Error('redis down'))),
    ).pulse(NOW);

    expect(pulse).toMatchObject({
      eventsPerMinute: null,
      sockets: null,
      simulator: null,
      webhooks: { n: 0 },
      queues: [],
      services: { database: false, redis: false },
    });
  });

  it('gives up on a part that hangs after 2 s', async () => {
    vi.useFakeTimers();
    socketCounts.mockReturnValue(new Promise(() => {}));

    const pending = service().pulse(NOW);
    await vi.advanceTimersByTimeAsync(2_000);

    expect((await pending).sockets).toBeNull();
  });
});
