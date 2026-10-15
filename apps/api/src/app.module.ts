import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { CarriersModule } from './modules/carriers/carriers.module';
import { HealthModule } from './modules/health/health.module';
import { ModalitiesModule } from './modules/modalities/modalities.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { validateEnv } from './shared/config/env.validation';
import { PasswordModule } from './shared/password/password.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { RedisModule } from './shared/redis/redis.module';
import { ThrottlingModule } from './shared/throttling/throttling.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    ThrottlingModule,
    PasswordModule,
    SellersModule,
    CarriersModule,
    ModalitiesModule,
    ShipmentsModule,
    NotificationsModule,
    TrackingModule,
    AuthModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
