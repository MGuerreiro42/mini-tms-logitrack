import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './shared/prisma/prisma.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { CarriersModule } from './modules/carriers/carriers.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    PrismaModule,
    SellersModule,
    CarriersModule,
    ShipmentsModule,
    NotificationsModule,
    TrackingModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
