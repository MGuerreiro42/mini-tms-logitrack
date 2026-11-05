import type { Job } from 'bullmq';
import type { DemoResetService } from './demo-reset.service';
import { DRIVE_JOB, RESET_JOB, TICK_JOB } from './simulator.constants';
import { SimulatorProcessor } from './simulator.processor';
import type { SimulatorService } from './simulator.service';

describe('SimulatorProcessor', () => {
  const tick = vi.fn();
  const drive = vi.fn();
  const reset = vi.fn();
  const processor = new SimulatorProcessor(
    { tick, drive } as unknown as SimulatorService,
    { reset } as unknown as DemoResetService,
  );
  const job = (name: string) => ({ name }) as Job;

  it('runs a simulator tick for a tick job', async () => {
    await processor.process(job(TICK_JOB));

    expect(tick).toHaveBeenCalledOnce();
  });

  it('reports road positions for a drive job', async () => {
    await processor.process(job(DRIVE_JOB));

    expect(drive).toHaveBeenCalledOnce();
  });

  it('resets the demo tenant for a reset job', async () => {
    await processor.process(job(RESET_JOB));

    expect(reset).toHaveBeenCalledOnce();
  });

  it('rejects a job it does not know', async () => {
    await expect(processor.process(job('unknown'))).rejects.toThrow(
      'Unknown demo job: unknown',
    );
  });
});
