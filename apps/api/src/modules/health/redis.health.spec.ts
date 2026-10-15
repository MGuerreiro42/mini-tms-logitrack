import { HealthIndicatorService } from '@nestjs/terminus';
import type { Redis } from 'ioredis';
import { RedisHealthIndicator } from './redis.health';

describe('RedisHealthIndicator', () => {
  const ping = vi.fn();
  const indicator = new RedisHealthIndicator(new HealthIndicatorService(), {
    ping,
  } as unknown as Redis);

  it('is up when Redis answers the ping', async () => {
    ping.mockResolvedValue('PONG');

    await expect(indicator.pingCheck('redis')).resolves.toEqual({
      redis: { status: 'up' },
    });
  });

  it('is down when the ping fails', async () => {
    ping.mockRejectedValue(new Error('Connection is closed.'));

    await expect(indicator.pingCheck('redis')).resolves.toEqual({
      redis: { status: 'down' },
    });
  });
});
