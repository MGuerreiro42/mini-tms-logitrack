import { Module } from '@nestjs/common';
import { ModalitiesController } from './modalities.controller';
import { ModalitiesService } from './modalities.service';

@Module({
  controllers: [ModalitiesController],
  providers: [ModalitiesService],
})
export class ModalitiesModule {}
