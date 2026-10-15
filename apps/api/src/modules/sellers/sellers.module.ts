import { Module } from '@nestjs/common';
import { ModalitiesModule } from '../modalities/modalities.module';
import { SellersController } from './sellers.controller';
import { SellersService } from './sellers.service';

@Module({
  imports: [ModalitiesModule],
  controllers: [SellersController],
  providers: [SellersService],
})
export class SellersModule {}
