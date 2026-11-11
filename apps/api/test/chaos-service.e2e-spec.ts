import { getQueueToken } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import {
  CHAOS_COOLDOWN_KEY,
  CHAOS_KEY,
  CHAOS_RUNS_KEY,
  ChaosService,
  type ChaosState,
  readChaos,
} from '../src/modules/simulator/chaos.service';
import { DEMO_CHAOS_CHANGED } from '../src/modules/simulator/chaos-events';
import { LAST_RESET_KEY } from '../src/modules/simulator/demo-reset.service';
import {
  CHAOS_END_JOB,
  DEMO_QUEUE,
} from '../src/modules/simulator/simulator.constants';
import { REDIS_CLIENT } from '../src/shared/redis/redis.module';
import { type E2eContext, startApp } from './support/e2e-app';

// AppModule decides whether to load the simulator when it is imported, before any hook runs.
vi.hoisted(() => {
  process.env.DEMO_SIMULATOR = 'true';
});

const ADMIN = 'admin@minitms.dev';

// Against real Redis and BullMQ: the start and end scripts run as they do in production.
describe('ChaosService (e2e)', () => {
  let ctx: E2eContext;
  let redis: Redis;
  let queue: Queue;
  let chaos: ChaosService;
  let events: { scenario: string; active: boolean }[];

  const runs = async () =>
    (await redis.lrange(CHAOS_RUNS_KEY, 0, -1)).map((run) => JSON.parse(run));
  // A stored run whose end has passed but whose end job has not run.
  const storeOverdueRun = async () => {
    const state: ChaosState = {
      runId: 'overdue-run',
      scenario: 'carrier-outage',
      startedAt: new Date(Date.now() - 120_000).toISOString(),
      endsAt: new Date(Date.now() - 1_000).toISOString(),
      startedBy: ADMIN,
    };
    await redis.set(CHAOS_KEY, JSON.stringify(state));
    return state;
  };

  beforeAll(async () => {
    ctx = await startApp();
    redis = ctx.app.get(REDIS_CLIENT);
    // A fresh mark keeps the startup catch-up reset from ending the runs under test.
    await redis.set(LAST_RESET_KEY, Date.now());
    queue = ctx.app.get<Queue>(getQueueToken(DEMO_QUEUE));
    chaos = ctx.app.get(ChaosService);
    ctx.app
      .get(EventEmitter2)
      .on(DEMO_CHAOS_CHANGED, ({ run, active }) =>
        events.push({ scenario: run.scenario, active }),
      );
  });

  beforeEach(async () => {
    await redis.del(CHAOS_KEY, CHAOS_COOLDOWN_KEY, CHAOS_RUNS_KEY);
    events = [];
  });

  afterAll(async () => {
    await queue.obliterate({ force: true });
    await redis.del(
      LAST_RESET_KEY,
      CHAOS_KEY,
      CHAOS_COOLDOWN_KEY,
      CHAOS_RUNS_KEY,
    );
    await ctx.app.close();
    delete process.env.DEMO_SIMULATOR;
  });

  it('admits exactly one of two concurrent starts and schedules its end', async () => {
    const results = await Promise.allSettled([
      chaos.start('failed-deliveries', 60, ADMIN),
      chaos.start('carrier-outage', 60, ADMIN),
    ]);

    const started = results.filter((r) => r.status === 'fulfilled');
    expect(started).toHaveLength(1);
    const { runId } = (started[0] as PromiseFulfilledResult<ChaosState>).value;
    const job = await queue.getJob(`${CHAOS_END_JOB}-${runId}`);
    expect(job?.opts).toMatchObject({ delay: 60_000, attempts: 5 });
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { message: 'A scenario is already running' },
    });
  });

  it('ends a run once, records it and refuses a start during the cooldown', async () => {
    const { runId } = await chaos.start('webhook-down', 60, ADMIN);

    await Promise.all([chaos.end(runId, 'admin'), chaos.end(runId, 'expired')]);

    expect(await redis.exists(CHAOS_KEY)).toBe(0);
    expect(await runs()).toEqual([
      expect.objectContaining({ scenario: 'webhook-down' }),
    ]);
    expect(events).toEqual([
      { scenario: 'webhook-down', active: true },
      { scenario: 'webhook-down', active: false },
    ]);
    await expect(chaos.start('webhook-down', 60, ADMIN)).rejects.toThrow(
      'Chaos Mode is cooling down',
    );
  });

  it('ignores the end of a stale run', async () => {
    await chaos.start('failed-deliveries', 60, ADMIN);

    await chaos.end('an-older-run', 'expired');

    expect(await chaos.active()).not.toBeNull();
    expect(await runs()).toEqual([]);
  });

  it('ends a run now through its end job, as an admin end', async () => {
    await chaos.start('failed-deliveries', 60, ADMIN);

    await expect(chaos.endNow()).resolves.toBe(true);

    expect(await runs()).toEqual([
      expect.objectContaining({ reason: 'admin' }),
    ]);
    await expect(chaos.endNow()).resolves.toBe(false);
  });

  describe('a run past its end whose end job has not run', () => {
    it('reads as inactive', async () => {
      const state = await storeOverdueRun();

      await expect(readChaos(redis)).resolves.toBeNull();
      await expect(
        readChaos(redis, Date.parse(state.endsAt) - 1),
      ).resolves.toEqual(state);
    });

    it('is ended as expired by End now', async () => {
      await storeOverdueRun();

      await expect(chaos.endNow()).resolves.toBe(true);

      expect(await runs()).toEqual([
        expect.objectContaining({ reason: 'expired' }),
      ]);
    });

    it('is ended as expired by a start, which then answers the cooldown', async () => {
      await storeOverdueRun();

      await expect(chaos.start('webhook-down', 60, ADMIN)).rejects.toThrow(
        'Chaos Mode is cooling down',
      );
      expect(await runs()).toEqual([
        expect.objectContaining({ reason: 'expired' }),
      ]);
    });

    it('is recorded as expired by the reset', async () => {
      await storeOverdueRun();

      await chaos.endStored('reset');

      expect(await runs()).toEqual([
        expect.objectContaining({ reason: 'expired' }),
      ]);
    });
  });

  it('records a running run ended by the reset', async () => {
    await chaos.start('carrier-outage', 60, ADMIN);

    await chaos.endStored('reset');

    expect(await runs()).toEqual([
      expect.objectContaining({ reason: 'reset' }),
    ]);
  });
});
