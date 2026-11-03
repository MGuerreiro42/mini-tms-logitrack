import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { DemoResetService } from './demo-reset.service';
import { DEMO_QUEUE, RESET_JOB, TICK_JOB } from './simulator.constants';
import { SimulatorService } from './simulator.service';

@Processor(DEMO_QUEUE)
export class SimulatorProcessor extends WorkerHost {
  constructor(
    private readonly simulatorService: SimulatorService,
    private readonly demoResetService: DemoResetService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case TICK_JOB:
        return this.simulatorService.tick();
      case RESET_JOB:
        return this.demoResetService.reset();
      default:
        throw new Error(`Unknown ${DEMO_QUEUE} job: ${job.name}`);
    }
  }
}
