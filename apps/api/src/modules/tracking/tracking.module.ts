import { Module } from '@nestjs/common';
import { TrackingService } from './tracking.service';

@Module({
  providers: [TrackingService],
})
export class TrackingModule {}
