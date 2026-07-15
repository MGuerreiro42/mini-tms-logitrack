import { Module } from '@nestjs/common';
import { PublicTrackingController } from './public-tracking.controller';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';

@Module({
  controllers: [ShipmentsController, PublicTrackingController],
  providers: [ShipmentsService],
})
export class ShipmentsModule {}
