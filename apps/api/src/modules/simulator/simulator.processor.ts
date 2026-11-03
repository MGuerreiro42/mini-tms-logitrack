import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { DEMO_QUEUE, TICK_JOB } from './simulator.constants';
import { SimulatorService } from './simulator.service';

@Processor(DEMO_QUEUE)
export class SimulatorProcessor extends WorkerHost {
  constructor(private readonly simulatorService: SimulatorService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case TICK_JOB:
        return this.simulatorService.tick();
      default:
        throw new Error(`Unknown ${DEMO_QUEUE} job: ${job.name}`);
    }
  }
}
