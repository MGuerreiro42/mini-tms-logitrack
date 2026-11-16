import { randomUUID } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Job, JobsOptions, Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../shared/redis/redis.module';
import { MS_PER_HOUR } from '../../shared/stats/stats';
import { DEMO_CHAOS_CHANGED, type DemoChaosChangedEvent } from './chaos-events';
import type { ChaosScenarioId } from './chaos-scenarios';
import { CHAOS_END_JOB, DEMO_QUEUE } from './simulator.constants';
import {
  DemoQueueEvents,
  JOB_OPTIONS,
  JOB_WAIT_MS,
} from './simulator.scheduler';

export const CHAOS_KEY = 'demo:chaos';
export const CHAOS_COOLDOWN_KEY = 'demo:chaos:cooldown';
export const CHAOS_RUNS_KEY = 'demo:chaos:runs';
const COOLDOWN_SEC = 60;
const RUNS_KEPT = 10;

export const CHAOS_END_REASONS = ['expired', 'admin', 'reset'] as const;
export type ChaosEndReason = (typeof CHAOS_END_REASONS)[number];

export interface ChaosState {
  runId: string;
  scenario: ChaosScenarioId;
  startedAt: string;
  endsAt: string;
  startedBy: string;
}

export interface ChaosRun {
  scenario: ChaosScenarioId;
  startedAt: string;
  endedAt: string;
  reason: ChaosEndReason;
}

export interface ChaosEndJobData {
  runId: string;
  reason: ChaosEndReason;
}

// BullMQ custom job ids must not contain ':'.
const endJobId = (runId: string) => `${CHAOS_END_JOB}-${runId}`;

// A failed end would leave the run blocking every start until the key's safety expiry.
const END_JOB_OPTIONS: JobsOptions = {
  ...JOB_OPTIONS,
  attempts: 5,
  backoff: { type: 'exponential', delay: 1_000 },
};

// Cooldown and one-at-a-time in one atomic step, so two admins pressing Start admit exactly one.
const START_SCRIPT = `
if redis.call('exists', KEYS[2]) == 1 then return 'cooldown' end
if redis.call('set', KEYS[1], ARGV[1], 'NX', 'PX', ARGV[2]) then return 'ok' end
return 'running'`;

// Compare-and-delete: whichever path ends a run first wins, the others find another runId.
const END_SCRIPT = `
local raw = redis.call('get', KEYS[1])
if not raw or cjson.decode(raw).runId ~= ARGV[1] then return 0 end
redis.call('del', KEYS[1])
redis.call('set', KEYS[2], '1', 'EX', ARGV[2])
redis.call('lpush', KEYS[3], ARGV[3])
redis.call('ltrim', KEYS[3], 0, ARGV[4] - 1)
return 1`;

const START_REFUSALS: Record<string, string> = {
  cooldown: 'Chaos Mode is cooling down',
  running: 'A scenario is already running',
};

const storedState = async (redis: Redis): Promise<ChaosState | null> => {
  const raw = await redis.get(CHAOS_KEY);
  return raw ? (JSON.parse(raw) as ChaosState) : null;
};

const isOver = (state: ChaosState, now = Date.now()) =>
  Date.parse(state.endsAt) <= now;

// Exported for the pulse, which must not depend on the conditionally loaded simulator module.
// A state past endsAt is over for every reader, even before its end job has run.
export const readChaos = async (
  redis: Redis,
  now = Date.now(),
): Promise<ChaosState | null> => {
  const state = await storedState(redis);
  return state && !isOver(state, now) ? state : null;
};

@Injectable()
export class ChaosService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectQueue(DEMO_QUEUE) private readonly queue: Queue,
    private readonly queueEvents: DemoQueueEvents,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  active(): Promise<ChaosState | null> {
    return readChaos(this.redis);
  }

  async cooldownUntil(): Promise<Date | null> {
    const ms = await this.redis.pttl(CHAOS_COOLDOWN_KEY);
    return ms > 0 ? new Date(Date.now() + ms) : null;
  }

  async runs(limit: number): Promise<ChaosRun[]> {
    const runs = await this.redis.lrange(CHAOS_RUNS_KEY, 0, limit - 1);
    return runs.map((run) => JSON.parse(run) as ChaosRun);
  }

  async start(
    scenario: ChaosScenarioId,
    durationSec: number,
    startedBy: string,
  ): Promise<ChaosState> {
    // A run whose end job is late or failed must not hold the slot past its end.
    await this.endIfOver(await storedState(this.redis));

    const now = Date.now();
    const durationMs = durationSec * 1000;
    const state: ChaosState = {
      runId: randomUUID(),
      scenario,
      startedAt: new Date(now).toISOString(),
      endsAt: new Date(now + durationMs).toISOString(),
      startedBy,
    };
    // The expiry is only a safety net: the end job is what ends a run.
    const outcome = await this.redis.eval(
      START_SCRIPT,
      2,
      CHAOS_KEY,
      CHAOS_COOLDOWN_KEY,
      JSON.stringify(state),
      durationMs + MS_PER_HOUR,
    );
    if (outcome !== 'ok') {
      throw new ConflictException(START_REFUSALS[String(outcome)]);
    }

    try {
      await this.queue.add(
        CHAOS_END_JOB,
        { runId: state.runId, reason: 'expired' } satisfies ChaosEndJobData,
        { ...END_JOB_OPTIONS, delay: durationMs, jobId: endJobId(state.runId) },
      );
    } catch (error) {
      // Without its end job the run would block every start for an hour.
      await this.redis.del(CHAOS_KEY);
      throw error;
    }
    this.emit(state, true);
    return state;
  }

  // Idempotent: only the first end of a run records it and tells the clients.
  async end(runId: string, reason: ChaosEndReason): Promise<void> {
    const state = await storedState(this.redis);
    if (state?.runId !== runId) return;

    const run: ChaosRun = {
      scenario: state.scenario,
      startedAt: state.startedAt,
      endedAt: new Date().toISOString(),
      reason,
    };
    const ended = await this.redis.eval(
      END_SCRIPT,
      3,
      CHAOS_KEY,
      CHAOS_COOLDOWN_KEY,
      CHAOS_RUNS_KEY,
      runId,
      COOLDOWN_SEC,
      JSON.stringify(run),
      RUNS_KEPT,
    );
    if (ended === 1) this.emit(state, false);
  }

  // For the reset job; a run already past its end is recorded as expired, which it was.
  async endStored(reason: ChaosEndReason): Promise<void> {
    const state = await storedState(this.redis);
    if (state) await this.end(state.runId, isOver(state) ? 'expired' : reason);
  }

  // False when no run is stored. Promotes the run's end job so the end stays in the queue.
  async endNow(): Promise<boolean> {
    const state = await storedState(this.redis);
    if (!state) return false;
    if (await this.endIfOver(state)) return true;

    const data: ChaosEndJobData = { runId: state.runId, reason: 'admin' };
    const job: Job =
      (await this.queue.getJob(endJobId(state.runId))) ??
      (await this.queue.add(CHAOS_END_JOB, data, {
        ...END_JOB_OPTIONS,
        jobId: endJobId(state.runId),
      }));
    await job.updateData(data);
    if (await job.isFailed()) await job.retry();
    // Already running: it ends the run as expired, which is just as final.
    await job.promote().catch(() => undefined);
    try {
      await job.waitUntilFinished(this.queueEvents.queueEvents, JOB_WAIT_MS);
    } catch (error) {
      // A job that finished and was removed before we listened reads as missing.
      if ((await storedState(this.redis))?.runId === state.runId) throw error;
    }
    return true;
  }

  private async endIfOver(state: ChaosState | null): Promise<boolean> {
    if (!state || !isOver(state)) return false;
    await this.end(state.runId, 'expired');
    return true;
  }

  private emit(run: ChaosState, active: boolean): void {
    const event: DemoChaosChangedEvent = { run, active };
    this.eventEmitter.emit(DEMO_CHAOS_CHANGED, event);
  }
}
