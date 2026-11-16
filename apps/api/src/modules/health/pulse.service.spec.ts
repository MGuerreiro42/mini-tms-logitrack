import type { PrismaHealthIndicator } from '@nestjs/terminus';
import type { Queue } from 'bullmq';
import type { PrismaService } from '../../shared/prisma/prisma.service';
import type { TrackingPresence } from '../tracking/tracking-presence';
import { PulseService } from './pulse.service';
import type { RedisHealthIndicator } from './redis.health';

const NOW = new Date('2026-11-10T12:00:00Z');

describe('PulseService', () => {
  const trackingEvents = vi.fn();
  const webhookDeliveries = vi.fn();
  const socketCounts = vi.fn();
  const databasePing = vi.fn();
  const redisPing = vi.fn();
  const queue = (name: string, getJobCounts = vi.fn()) =>
    ({ name, getJobCounts }) as unknown as Queue;

  // One tagged $queryRaw per part, told apart by the table it reads.
  const queryRaw = (strings: TemplateStringsArray) =>
    strings.join('').includes('"TrackingEvent"')
      ? trackingEvents()
      : webhookDeliveries();

  const service = (demoQueue?: Queue, webhooksQueue = queue('webhooks')) =>
    new PulseService(
      { $queryRaw: queryRaw } as unknown as PrismaService,
      { socketCounts } as unknown as TrackingPresence,
      { pingCheck: databasePing } as unknown as PrismaHealthIndicator,
      { pingCheck: redisPing } as unknown as RedisHealthIndicator,
      webhooksQueue,
      demoQueue,
    );

  beforeEach(() => {
    trackingEvents.mockResolvedValue([]);
    webhookDeliveries.mockResolvedValue([{ n: 0, succeeded: 0, p95: null }]);
    socketCounts.mockResolvedValue({ internal: 0, public: 0 });
    databasePing.mockResolvedValue({ database: { status: 'up' } });
    redisPing.mockResolvedValue({ redis: { status: 'up' } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('spreads the per-minute counts over 15 minutes, oldest first', async () => {
    trackingEvents.mockResolvedValue([
      { minute: 0, n: 2 },
      { minute: 14, n: 1 },
      // An event at exactly now lands one past the last minute.
      { minute: 15, n: 1 },
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

    webhookDeliveries.mockResolvedValue([{ n: 4, succeeded: 3, p95: 900 }]);
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
