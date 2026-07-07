import { Module } from '@nestjs/common';
import { CarriersController } from './carriers.controller';
import { CarriersService } from './carriers.service';
import { InvitesModule } from './invites/invites.module';

@Module({
  controllers: [CarriersController],
  providers: [CarriersService],
  imports: [InvitesModule],
})
export class CarriersModule {}
