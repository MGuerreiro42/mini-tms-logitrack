import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import { DEMO_QUEUE, TICK_EVERY_MS, TICK_JOB } from './simulator.constants';

const FAILED_JOBS_KEPT = 50;

@Injectable()
export class SimulatorScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(SimulatorScheduler.name);

  constructor(@InjectQueue(DEMO_QUEUE) private readonly queue: Queue) {}

  // Not awaited: with Redis down the API must still boot and serve requests.
  onApplicationBootstrap(): void {
    this.schedule().catch((error: unknown) =>
      this.logger.error(`Could not schedule demo jobs: ${String(error)}`),
    );
  }

  private async schedule(): Promise<void> {
    // One job at a time across every instance, so a tick never overlaps another demo job.
    await this.queue.setGlobalConcurrency(1);
    await this.queue.upsertJobScheduler(
      TICK_JOB,
      { every: TICK_EVERY_MS },
      {
        name: TICK_JOB,
        opts: { removeOnComplete: true, removeOnFail: FAILED_JOBS_KEPT },
      },
    );
  }
}
