import type { Job } from 'bullmq';
import { TICK_JOB } from './simulator.constants';
import { SimulatorProcessor } from './simulator.processor';
import type { SimulatorService } from './simulator.service';

describe('SimulatorProcessor', () => {
  const tick = vi.fn();
  const processor = new SimulatorProcessor({
    tick,
  } as unknown as SimulatorService);
  const job = (name: string) => ({ name }) as Job;

  it('runs a simulator tick for a tick job', async () => {
    await processor.process(job(TICK_JOB));

    expect(tick).toHaveBeenCalledOnce();
  });

  it('rejects a job it does not know', async () => {
    await expect(processor.process(job('unknown'))).rejects.toThrow(
      'Unknown demo job: unknown',
    );
  });
});
