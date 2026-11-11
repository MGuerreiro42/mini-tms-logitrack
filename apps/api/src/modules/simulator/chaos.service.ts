import { randomUUID } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Job, Queue } from 'bullmq';
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

export type ChaosEndReason = 'expired' | 'admin' | 'reset';

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

// Cooldown and one-at-a-time in one atomic step, so two admins pressing Start admit exactly one.
const START_SCRIPT = `
if redis.call('exists', KEYS[2]) == 1 then return 'cooldown' end
if redis.call('set', KEYS[1], ARGV[1], 'NX', 'PX', ARGV[2]) then return 'ok' end
return 'running'`;

const START_REFUSALS: Record<string, string> = {
  cooldown: 'Chaos Mode is cooling down',
  running: 'A scenario is already running',
};

const storedState = async (redis: Redis): Promise<ChaosState | null> => {
  const raw = await redis.get(CHAOS_KEY);
  return raw ? (JSON.parse(raw) as ChaosState) : null;
};

// Exported for the pulse, which must not depend on the conditionally loaded simulator module.
// A state past endsAt is over for every reader, even before its end job has run.
export const readChaos = async (
  redis: Redis,
  now = Date.now(),
): Promise<ChaosState | null> => {
  const state = await storedState(redis);
  return state && Date.parse(state.endsAt) > now ? state : null;
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

  async start(
    scenario: ChaosScenarioId,
    durationSec: number,
    startedBy: string,
  ): Promise<ChaosState> {
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
        { ...JOB_OPTIONS, delay: durationMs, jobId: endJobId(state.runId) },
      );
    } catch (error) {
      // Without its end job the run would block every start for an hour.
      await this.redis.del(CHAOS_KEY);
      throw error;
    }
    this.emit(state, true);
    return state;
  }

  // Runs only inside the demo queue (one job at a time), so reading then deleting cannot race.
  async end(runId: string, reason: ChaosEndReason): Promise<void> {
    const state = await storedState(this.redis);
    if (state?.runId !== runId) return;

    const run: ChaosRun = {
      scenario: state.scenario,
      startedAt: state.startedAt,
      endedAt: new Date().toISOString(),
      reason,
    };
    await this.redis
      .multi()
      .del(CHAOS_KEY)
      .set(CHAOS_COOLDOWN_KEY, '1', 'EX', COOLDOWN_SEC)
      .lpush(CHAOS_RUNS_KEY, JSON.stringify(run))
      .ltrim(CHAOS_RUNS_KEY, 0, RUNS_KEPT - 1)
      .exec();
    this.emit(state, false);
  }

  // For the reset job, which already runs inside the queue; ends a run even past endsAt.
  async endStored(reason: ChaosEndReason): Promise<void> {
    const state = await storedState(this.redis);
    if (state) await this.end(state.runId, reason);
  }

  // False when no scenario is active. Promotes the run's end job so the end stays in the queue.
  async endNow(): Promise<boolean> {
    const state = await this.active();
    if (!state) return false;

    const data: ChaosEndJobData = { runId: state.runId, reason: 'admin' };
    const job: Job =
      (await this.queue.getJob(endJobId(state.runId))) ??
      (await this.queue.add(CHAOS_END_JOB, data, {
        ...JOB_OPTIONS,
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

  private emit(run: ChaosState, active: boolean): void {
    const event: DemoChaosChangedEvent = { run, active };
    this.eventEmitter.emit(DEMO_CHAOS_CHANGED, event);
  }
}
