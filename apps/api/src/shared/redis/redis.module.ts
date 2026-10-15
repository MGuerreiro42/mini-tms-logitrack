import { Global, Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { EnvConfig } from '../config/env.validation';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

const MAX_RETRIES_PER_COMMAND = 2;

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig, true>) =>
        // Fail fast when Redis is down: the default queues each command behind 20 reconnect attempts.
        new Redis(configService.get('REDIS_URL', { infer: true }), {
          maxRetriesPerRequest: MAX_RETRIES_PER_COMMAND,
        }),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}
