import { Module } from '@nestjs/common';
import { ConditionalModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { isDemoSimulatorEnabled } from '../../shared/config/env.validation';
import { IntegrationsModule } from '../integrations/integrations.module';
import { SimulatorModule } from '../simulator/simulator.module';
import { TrackingModule } from '../tracking/tracking.module';
import { HealthController } from './health.controller';
import { PulseController } from './pulse.controller';
import { PulseService } from './pulse.service';
import { RedisHealthIndicator } from './redis.health';

@Module({
  imports: [
    TerminusModule,
    TrackingModule,
    // For their exported queues: webhooks always, demo only where the simulator runs.
    IntegrationsModule,
    ConditionalModule.registerWhen(SimulatorModule, isDemoSimulatorEnabled),
  ],
  controllers: [HealthController, PulseController],
  providers: [RedisHealthIndicator, PulseService],
})
export class HealthModule {}
