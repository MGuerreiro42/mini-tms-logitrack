import { Module } from '@nestjs/common';
import { ModalitiesModule } from '../modalities/modalities.module';
import { CarriersController } from './carriers.controller';
import { CarriersService } from './carriers.service';
import { InvitesModule } from './invites/invites.module';

@Module({
  controllers: [CarriersController],
  providers: [CarriersService],
  imports: [InvitesModule, ModalitiesModule],
})
export class CarriersModule {}
