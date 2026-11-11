import type { Job } from 'bullmq';
import type { ChaosService } from './chaos.service';
import type { DemoResetService } from './demo-reset.service';
import {
  CHAOS_END_JOB,
  DRIVE_JOB,
  RESET_JOB,
  TICK_JOB,
} from './simulator.constants';
import { SimulatorProcessor } from './simulator.processor';
import type { SimulatorService } from './simulator.service';

describe('SimulatorProcessor', () => {
  const tick = vi.fn();
  const drive = vi.fn();
  const reset = vi.fn();
  const end = vi.fn();
  const endStored = vi.fn();
  const processor = new SimulatorProcessor(
    { tick, drive } as unknown as SimulatorService,
    { reset } as unknown as DemoResetService,
    { end, endStored } as unknown as ChaosService,
  );
  const job = (name: string, data?: unknown) => ({ name, data }) as Job;

  it('runs a simulator tick for a tick job', async () => {
    await processor.process(job(TICK_JOB));

    expect(tick).toHaveBeenCalledOnce();
  });

  it('reports road positions for a drive job', async () => {
    await processor.process(job(DRIVE_JOB));

    expect(drive).toHaveBeenCalledOnce();
  });

  it('ends the running scenario, then resets the demo tenant, for a reset job', async () => {
    await processor.process(job(RESET_JOB));

    expect(endStored).toHaveBeenCalledWith('reset');
    expect(reset).toHaveBeenCalledOnce();
    expect(endStored.mock.invocationCallOrder[0]).toBeLessThan(
      reset.mock.invocationCallOrder[0],
    );
  });

  it('ends the run named by a chaos-end job', async () => {
    await processor.process(
      job(CHAOS_END_JOB, { runId: 'run-1', reason: 'expired' }),
    );

    expect(end).toHaveBeenCalledWith('run-1', 'expired');
  });

  it('rejects a job it does not know', async () => {
    await expect(processor.process(job('unknown'))).rejects.toThrow(
      'Unknown demo job: unknown',
    );
  });
});
