import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { type ChaosEndJobData, ChaosService } from './chaos.service';
import { DemoResetService } from './demo-reset.service';
import {
  CHAOS_END_JOB,
  DEMO_QUEUE,
  DRIVE_JOB,
  RESET_JOB,
  TICK_JOB,
} from './simulator.constants';
import { SimulatorService } from './simulator.service';

@Processor(DEMO_QUEUE)
export class SimulatorProcessor extends WorkerHost {
  constructor(
    private readonly simulatorService: SimulatorService,
    private readonly demoResetService: DemoResetService,
    private readonly chaosService: ChaosService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case TICK_JOB:
        return this.simulatorService.tick();
      case DRIVE_JOB:
        return this.simulatorService.drive();
      case RESET_JOB:
        // The run ends before the dataset it plays on is rebuilt.
        await this.chaosService.endStored('reset');
        return this.demoResetService.reset();
      case CHAOS_END_JOB: {
        const { runId, reason } = job.data as ChaosEndJobData;
        return this.chaosService.end(runId, reason);
      }
      default:
        throw new Error(`Unknown ${DEMO_QUEUE} job: ${job.name}`);
    }
  }
}
