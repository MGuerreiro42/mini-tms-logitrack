import { ConflictException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import {
  CHAOS_COOLDOWN_KEY,
  CHAOS_KEY,
  CHAOS_RUNS_KEY,
  ChaosService,
  readChaos,
} from './chaos.service';
import { DEMO_CHAOS_CHANGED } from './chaos-events';
import { CHAOS_END_JOB } from './simulator.constants';
import type { DemoQueueEvents } from './simulator.scheduler';

const NOW = new Date('2026-01-01T12:00:00Z').getTime();

// Just enough of Redis for the chaos keys; the start script's atomicity is covered by the e2e.
function fakeRedis() {
  const store = new Map<string, string>();
  const lists = new Map<string, string[]>();
  // Applies the queued writes on exec, as MULTI does.
  const multi = () => {
    const ops: (() => void)[] = [];
    const queue = (op: () => void) => {
      ops.push(op);
      return chain;
    };
    const chain = {
      del: (key: string) => queue(() => store.delete(key)),
      set: (key: string, value: string) => queue(() => store.set(key, value)),
      lpush: (key: string, value: string) =>
        queue(() => lists.set(key, [value, ...(lists.get(key) ?? [])])),
      ltrim: (key: string, start: number, stop: number) =>
        queue(() =>
          lists.set(key, (lists.get(key) ?? []).slice(start, stop + 1)),
        ),
      exec: async () => {
        for (const op of ops) op();
      },
    };
    return chain;
  };
  const redis = {
    get: async (key: string) => store.get(key) ?? null,
    del: async (key: string) => store.delete(key),
    eval: async (
      _script: string,
      _keys: number,
      key: string,
      cooldownKey: string,
      value: string,
    ) => {
      if (store.has(cooldownKey)) return 'cooldown';
      if (store.has(key)) return 'running';
      store.set(key, value);
      return 'ok';
    },
    multi,
  };
  return { redis: redis as unknown as Redis, store, lists };
}

describe('ChaosService', () => {
  const add = vi.fn();
  const getJob = vi.fn();
  const emit = vi.fn();
  const job = {
    updateData: vi.fn(),
    isFailed: vi.fn(),
    retry: vi.fn(),
    promote: vi.fn(),
    waitUntilFinished: vi.fn(),
  };
  let fake: ReturnType<typeof fakeRedis>;
  let chaos: ChaosService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    job.promote.mockResolvedValue(undefined);
    fake = fakeRedis();
    chaos = new ChaosService(
      fake.redis,
      { add, getJob } as unknown as Queue,
      { queueEvents: {} } as DemoQueueEvents,
      { emit } as unknown as EventEmitter2,
    );
  });

  afterEach(() => vi.useRealTimers());

  const startStorm = () =>
    chaos.start('failed-deliveries', 180, 'admin@minitms.dev');

  it('stores the run, schedules its end and announces it', async () => {
    const state = await startStorm();

    expect(state).toMatchObject({
      scenario: 'failed-deliveries',
      startedAt: new Date(NOW).toISOString(),
      endsAt: new Date(NOW + 180_000).toISOString(),
      startedBy: 'admin@minitms.dev',
    });
    expect(JSON.parse(fake.store.get(CHAOS_KEY) ?? '')).toEqual(state);
    const [name, data, options] = add.mock.calls[0];
    expect(name).toBe(CHAOS_END_JOB);
    expect(data).toEqual({ runId: state.runId, reason: 'expired' });
    expect(options.delay).toBe(180_000);
    expect(options.jobId).not.toContain(':');
    expect(emit).toHaveBeenCalledWith(DEMO_CHAOS_CHANGED, {
      run: state,
      active: true,
    });
  });

  it('refuses a second scenario while one runs', async () => {
    await startStorm();

    await expect(
      chaos.start('carrier-outage', 60, 'other@minitms.dev'),
    ).rejects.toThrow(new ConflictException('A scenario is already running'));
  });

  it('refuses to start during the cooldown', async () => {
    fake.store.set(CHAOS_COOLDOWN_KEY, '1');

    await expect(startStorm()).rejects.toThrow(
      new ConflictException('Chaos Mode is cooling down'),
    );
    expect(fake.store.has(CHAOS_KEY)).toBe(false);
  });

  it('drops the run when its end job cannot be scheduled', async () => {
    add.mockRejectedValue(new Error('Redis down'));

    await expect(startStorm()).rejects.toThrow('Redis down');
    expect(fake.store.has(CHAOS_KEY)).toBe(false);
    expect(emit).not.toHaveBeenCalled();
  });

  it('ends a run exactly once, with a cooldown and a run record', async () => {
    const state = await startStorm();
    emit.mockClear();

    await chaos.end(state.runId, 'admin');
    await chaos.end(state.runId, 'expired');

    expect(fake.store.has(CHAOS_KEY)).toBe(false);
    expect(fake.store.has(CHAOS_COOLDOWN_KEY)).toBe(true);
    expect(fake.lists.get(CHAOS_RUNS_KEY)?.map((r) => JSON.parse(r))).toEqual([
      {
        scenario: 'failed-deliveries',
        startedAt: state.startedAt,
        endedAt: new Date(NOW).toISOString(),
        reason: 'admin',
      },
    ]);
    expect(emit).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith(DEMO_CHAOS_CHANGED, {
      run: state,
      active: false,
    });
  });

  it('ignores the end of a stale run', async () => {
    await startStorm();
    emit.mockClear();

    await chaos.end('an-older-run', 'expired');

    expect(fake.store.has(CHAOS_KEY)).toBe(true);
    expect(emit).not.toHaveBeenCalled();
  });

  it('ends the stored run for the reset, even past its end time', async () => {
    await startStorm();
    vi.setSystemTime(NOW + 10 * 60_000);

    await chaos.endStored('reset');

    expect(fake.store.has(CHAOS_KEY)).toBe(false);
    expect(JSON.parse(fake.lists.get(CHAOS_RUNS_KEY)?.[0] ?? '')).toMatchObject(
      { reason: 'reset' },
    );
  });

  it('reads a state past its end time as inactive', async () => {
    const state = await startStorm();

    await expect(readChaos(fake.redis)).resolves.toEqual(state);
    await expect(
      readChaos(fake.redis, Date.parse(state.endsAt)),
    ).resolves.toBeNull();
  });

  describe('endNow', () => {
    it('answers false when no scenario is active', async () => {
      await expect(chaos.endNow()).resolves.toBe(false);
      expect(getJob).not.toHaveBeenCalled();
    });

    it("promotes the run's end job as an admin end and waits for it", async () => {
      const state = await startStorm();
      getJob.mockResolvedValue(job);

      await expect(chaos.endNow()).resolves.toBe(true);

      expect(getJob).toHaveBeenCalledWith(`${CHAOS_END_JOB}-${state.runId}`);
      expect(job.updateData).toHaveBeenCalledWith({
        runId: state.runId,
        reason: 'admin',
      });
      expect(job.promote).toHaveBeenCalled();
      expect(job.waitUntilFinished).toHaveBeenCalled();
    });

    it('adds an end job when the scheduled one is gone', async () => {
      const state = await startStorm();
      add.mockClear();
      getJob.mockResolvedValue(undefined);
      add.mockResolvedValue(job);

      await chaos.endNow();

      expect(add).toHaveBeenCalledWith(
        CHAOS_END_JOB,
        { runId: state.runId, reason: 'admin' },
        expect.objectContaining({ jobId: `${CHAOS_END_JOB}-${state.runId}` }),
      );
    });

    it('fails when the run is still stored after the wait', async () => {
      await startStorm();
      getJob.mockResolvedValue(job);
      job.waitUntilFinished.mockRejectedValue(new Error('timed out'));

      await expect(chaos.endNow()).rejects.toThrow('timed out');
    });
  });
});
