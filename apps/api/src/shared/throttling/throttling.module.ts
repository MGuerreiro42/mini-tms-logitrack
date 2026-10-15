import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { FALLBACK_RATE_LIMIT, RATE_LIMIT_WINDOW } from './rate-limits';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) => ({
        throttlers: [{ ttl: RATE_LIMIT_WINDOW, limit: FALLBACK_RATE_LIMIT }],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
  ],
})
export class ThrottlingModule {}
