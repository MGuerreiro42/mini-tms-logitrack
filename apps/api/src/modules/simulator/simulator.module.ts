import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ShipmentsModule } from '../shipments/shipments.module';
import { TrackingModule } from '../tracking/tracking.module';
import { DemoResetController } from './demo-reset.controller';
import { DemoResetService } from './demo-reset.service';
import { DemoTenantService } from './demo-tenant.service';
import { DEMO_QUEUE, SIMULATOR_RANDOM } from './simulator.constants';
import { SimulatorProcessor } from './simulator.processor';
import { DemoQueueEvents, SimulatorScheduler } from './simulator.scheduler';
import { SimulatorService } from './simulator.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: DEMO_QUEUE }),
    ShipmentsModule,
    TrackingModule,
  ],
  controllers: [DemoResetController],
  providers: [
    DemoTenantService,
    DemoResetService,
    SimulatorService,
    SimulatorProcessor,
    SimulatorScheduler,
    DemoQueueEvents,
    { provide: SIMULATOR_RANDOM, useValue: Math.random },
  ],
  // The admin pulse reads this module's queue counts.
  exports: [BullModule],
})
export class SimulatorModule {}
