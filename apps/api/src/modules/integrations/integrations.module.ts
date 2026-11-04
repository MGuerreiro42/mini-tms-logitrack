import { Module } from '@nestjs/common';
import { ShipmentsModule } from '../shipments/shipments.module';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { PublicApiController } from './public-api.controller';

@Module({
  imports: [ShipmentsModule],
  controllers: [ApiKeysController, PublicApiController],
  providers: [ApiKeysService],
})
export class IntegrationsModule {}
