import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PublicTrackingGateway } from './public-tracking.gateway';
import { TrackingGateway } from './tracking.gateway';
import { TrackingListener } from './tracking.listener';

@Module({
  // Reuses AuthModule's JwtModule so the gateway verifies tokens with the same secret.
  imports: [AuthModule],
  providers: [TrackingGateway, PublicTrackingGateway, TrackingListener],
})
export class TrackingModule {}
