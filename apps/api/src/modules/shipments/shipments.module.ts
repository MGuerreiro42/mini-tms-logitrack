import { Module } from '@nestjs/common';
import { AdminShipmentsController } from './admin-shipments.controller';
import { PublicTrackingController } from './public-tracking.controller';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';

@Module({
  controllers: [
    ShipmentsController,
    PublicTrackingController,
    AdminShipmentsController,
  ],
  providers: [ShipmentsService],
})
export class ShipmentsModule {}
