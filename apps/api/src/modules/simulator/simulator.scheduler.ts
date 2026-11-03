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
import type { JobsOptions, Queue } from 'bullmq';
import { DemoResetService } from './demo-reset.service';
import {
  DEMO_QUEUE,
  RESET_CRON,
  RESET_JOB,
  RESET_TIMEZONE,
  TICK_EVERY_MS,
  TICK_JOB,
} from './simulator.constants';

const FAILED_JOBS_KEPT = 50;
const RESET_WAIT_MS = 30_000;
const JOB_OPTIONS: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: FAILED_JOBS_KEPT,
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
    this.schedule().catch((error: unknown) =>
      this.logger.error(`Could not schedule demo jobs: ${String(error)}`),
    );
  }

  // Through the queue, so a manual reset never overlaps a tick or the scheduled reset.
  async resetNow(): Promise<void> {
    const job = await this.queue.add(RESET_JOB, {}, JOB_OPTIONS);
    await job.waitUntilFinished(this.queueEvents.queueEvents, RESET_WAIT_MS);
  }

  private async schedule(): Promise<void> {
    // One job at a time across every instance, so a tick never overlaps another demo job.
    await this.queue.setGlobalConcurrency(1);
    await this.queue.upsertJobScheduler(
      TICK_JOB,
      { every: TICK_EVERY_MS },
      { name: TICK_JOB, opts: JOB_OPTIONS },
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
}
