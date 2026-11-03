import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ShipmentsModule } from '../shipments/shipments.module';
import { TrackingModule } from '../tracking/tracking.module';
import { DemoTenantService } from './demo-tenant.service';
import { DEMO_QUEUE, SIMULATOR_RANDOM } from './simulator.constants';
import { SimulatorProcessor } from './simulator.processor';
import { SimulatorScheduler } from './simulator.scheduler';
import { SimulatorService } from './simulator.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: DEMO_QUEUE }),
    ShipmentsModule,
    TrackingModule,
  ],
  providers: [
    DemoTenantService,
    SimulatorService,
    SimulatorProcessor,
    SimulatorScheduler,
    { provide: SIMULATOR_RANDOM, useValue: Math.random },
  ],
})
export class SimulatorModule {}
