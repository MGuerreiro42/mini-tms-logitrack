import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PublicTrackingGateway } from './public-tracking.gateway';
import { TrackingGateway } from './tracking.gateway';
import { TrackingListener } from './tracking.listener';

@Module({
  // AuthModule already exports JwtModule (auth.module.ts) — reused here so
  // TrackingGateway can verify a socket's JWT the same way JwtStrategy does,
  // without a second JwtModule.registerAsync duplicating the same secret.
  imports: [AuthModule],
  providers: [TrackingGateway, PublicTrackingGateway, TrackingListener],
})
export class TrackingModule {}
