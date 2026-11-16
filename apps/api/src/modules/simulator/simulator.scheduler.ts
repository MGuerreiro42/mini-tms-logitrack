import {
  InjectQueue,
  QueueEventsHost,
  QueueEventsListener,
} from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { JobsOptions, Queue } from 'bullmq';
import { VIEWER_CONNECTED } from '../tracking/tracking-events';
import { DemoResetService } from './demo-reset.service';
import {
  DEMO_QUEUE,
  DRIVE_EVERY_MS,
  DRIVE_JOB,
  RESET_CRON,
  RESET_JOB,
  RESET_TIMEZONE,
  TICK_EVERY_MS,
  TICK_JOB,
} from './simulator.constants';

const FAILED_JOBS_KEPT = 50;
export const JOB_WAIT_MS = 30_000;
export const JOB_OPTIONS: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: FAILED_JOBS_KEPT,
};
// A burst of arrivals adds at most one extra tick per interval.
const VIEWER_TICK_OPTIONS: JobsOptions = {
  ...JOB_OPTIONS,
  deduplication: { id: 'viewer-connected', ttl: TICK_EVERY_MS },
};

@QueueEventsListener(DEMO_QUEUE)
export class DemoQueueEvents extends QueueEventsHost {}

@Injectable()
export class SimulatorScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(SimulatorScheduler.name);

  constructor(
    @InjectQueue(DEMO_QUEUE) private readonly queue: Queue,
    private readonly queueEvents: DemoQueueEvents,
    private readonly demoResetService: DemoResetService,
  ) {}

  // Not awaited: with Redis down the API must still boot and serve requests.
  onApplicationBootstrap(): void {
    this.schedule().catch(this.logFailure('Could not schedule demo jobs'));
  }

  // Something moves right after a visitor arrives, instead of at the next scheduled tick.
  @OnEvent(VIEWER_CONNECTED)
  tickSoon(): void {
    this.queue
      .add(TICK_JOB, {}, VIEWER_TICK_OPTIONS)
      .catch(this.logFailure('Could not queue a tick for a new viewer'));
  }

  // Through the queue, so a manual reset never overlaps a tick or the scheduled reset.
  async resetNow(): Promise<void> {
    const job = await this.queue.add(RESET_JOB, {}, JOB_OPTIONS);
    await job.waitUntilFinished(this.queueEvents.queueEvents, JOB_WAIT_MS);
  }

  // Read from the job scheduler, so the cron pattern is never parsed here.
  async nextResetAt(): Promise<Date | null> {
    const scheduler = await this.queue.getJobScheduler(RESET_JOB);
    return scheduler?.next ? new Date(scheduler.next) : null;
  }

  private async schedule(): Promise<void> {
    // One job at a time across every instance, so a tick, a drive and a reset never overlap.
    await this.queue.setGlobalConcurrency(1);
    await this.queue.upsertJobScheduler(
      TICK_JOB,
      { every: TICK_EVERY_MS },
      { name: TICK_JOB, opts: JOB_OPTIONS },
    );
    await this.queue.upsertJobScheduler(
      DRIVE_JOB,
      { every: DRIVE_EVERY_MS },
      { name: DRIVE_JOB, opts: JOB_OPTIONS },
    );
    await this.queue.upsertJobScheduler(
      RESET_JOB,
      { pattern: RESET_CRON, tz: RESET_TIMEZONE },
      { name: RESET_JOB, opts: JOB_OPTIONS },
    );

    if (await this.demoResetService.isOverdue()) {
      await this.queue.add(RESET_JOB, {}, JOB_OPTIONS);
    }
  }

  private logFailure(action: string) {
    return (error: unknown) => this.logger.error(`${action}: ${String(error)}`);
  }
}
