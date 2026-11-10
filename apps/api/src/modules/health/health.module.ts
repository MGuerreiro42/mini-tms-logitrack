import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
  // The admin pulse reads the same indicators as GET /health.
  exports: [TerminusModule, RedisHealthIndicator],
})
export class HealthModule {}
