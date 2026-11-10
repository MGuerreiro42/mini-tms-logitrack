import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConditionalModule } from '@nestjs/config';
import { isDemoSimulatorEnabled } from '../../shared/config/env.validation';
import { HealthModule } from '../health/health.module';
import { WEBHOOKS_QUEUE } from '../integrations/webhook-queue';
import { DEMO_QUEUE } from '../simulator/simulator.constants';
import { TrackingModule } from '../tracking/tracking.module';
import { AdminShipmentsController } from './admin-shipments.controller';
import { PublicTrackingController } from './public-tracking.controller';
import { PulseService } from './pulse.service';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';
import { VehiclePositions } from './vehicle-positions';

@Module({
  imports: [
    BullModule.registerQueue({ name: WEBHOOKS_QUEUE }),
    // The pulse lists the demo queue only where the simulator runs.
    ConditionalModule.registerWhen(
      BullModule.registerQueue({ name: DEMO_QUEUE }),
      isDemoSimulatorEnabled,
    ),
    HealthModule,
    TrackingModule,
  ],
  controllers: [
    ShipmentsController,
    PublicTrackingController,
    AdminShipmentsController,
  ],
  providers: [ShipmentsService, PulseService, VehiclePositions],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}
