import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PublicTrackingGateway } from './public-tracking.gateway';
import { TrackingGateway } from './tracking.gateway';
import { TrackingListener } from './tracking.listener';
import { TrackingPresence } from './tracking-presence';

@Module({
  imports: [AuthModule],
  providers: [
    TrackingGateway,
    PublicTrackingGateway,
    TrackingListener,
    TrackingPresence,
  ],
  exports: [TrackingPresence],
})
export class TrackingModule {}
