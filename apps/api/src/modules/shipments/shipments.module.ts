import { Module } from '@nestjs/common';
import { AdminShipmentsController } from './admin-shipments.controller';
import { PublicTrackingController } from './public-tracking.controller';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';
import { VehiclePositions } from './vehicle-positions';

@Module({
  controllers: [
    ShipmentsController,
    PublicTrackingController,
    AdminShipmentsController,
  ],
  providers: [ShipmentsService, VehiclePositions],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}
