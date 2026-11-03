import type { Job, Queue } from 'bullmq';
import type { DemoResetService } from './demo-reset.service';
import { RESET_JOB, TICK_EVERY_MS, TICK_JOB } from './simulator.constants';
import {
  type DemoQueueEvents,
  SimulatorScheduler,
} from './simulator.scheduler';

describe('SimulatorScheduler', () => {
  const add = vi.fn();
  const upsertJobScheduler = vi.fn();
  const setGlobalConcurrency = vi.fn();
  const isOverdue = vi.fn();
  const waitUntilFinished = vi.fn();
  const queueEvents = { queueEvents: {} } as DemoQueueEvents;

  const scheduler = new SimulatorScheduler(
    { add, upsertJobScheduler, setGlobalConcurrency } as unknown as Queue,
    queueEvents,
    { isOverdue } as unknown as DemoResetService,
  );
  const bootstrap = async () => {
    scheduler.onApplicationBootstrap();
    await vi.waitFor(() => expect(isOverdue).toHaveBeenCalled());
  };

  beforeEach(() => {
    vi.resetAllMocks();
    add.mockResolvedValue({ waitUntilFinished } as unknown as Job);
  });

  it('runs one demo job at a time and schedules the tick and the daily reset', async () => {
    await bootstrap();

    expect(setGlobalConcurrency).toHaveBeenCalledWith(1);
    expect(upsertJobScheduler).toHaveBeenCalledWith(
      TICK_JOB,
      { every: TICK_EVERY_MS },
      expect.objectContaining({ name: TICK_JOB }),
    );
    expect(upsertJobScheduler).toHaveBeenCalledWith(
      RESET_JOB,
      { pattern: '0 4 * * *', tz: 'America/Sao_Paulo' },
      expect.objectContaining({ name: RESET_JOB }),
    );
  });

  it('catches up on a missed reset at boot', async () => {
    isOverdue.mockResolvedValue(true);

    await bootstrap();

    await vi.waitFor(() =>
      expect(add).toHaveBeenCalledWith(RESET_JOB, {}, expect.any(Object)),
    );
  });

  it('skips the catch-up when the last reset is recent', async () => {
    isOverdue.mockResolvedValue(false);

    await bootstrap();

    expect(add).not.toHaveBeenCalled();
  });

  it('queues one deduplicated tick when a viewer connects', () => {
    scheduler.tickSoon();

    expect(add).toHaveBeenCalledWith(
      TICK_JOB,
      {},
      expect.objectContaining({
        deduplication: { id: 'viewer-connected', ttl: TICK_EVERY_MS },
      }),
    );
  });

  it('answers a manual reset once the queued job has finished', async () => {
    await scheduler.resetNow();

    expect(add).toHaveBeenCalledWith(RESET_JOB, {}, expect.any(Object));
    expect(waitUntilFinished).toHaveBeenCalledWith(
      queueEvents.queueEvents,
      expect.any(Number),
    );
  });
});
