import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../config/env.validation';

// BullMQ opens its own connections: workers need maxRetriesPerRequest null, unlike the fail-fast REDIS_CLIENT.
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig, true>) => ({
        connection: { url: configService.get('REDIS_URL', { infer: true }) },
      }),
    }),
  ],
})
export class QueueModule {}
