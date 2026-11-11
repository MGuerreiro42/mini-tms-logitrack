import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ShipmentsModule } from '../shipments/shipments.module';
import { DemoTenantService } from '../simulator/demo-tenant.service';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { PublicApiController } from './public-api.controller';
import { WebhookDeliveryProcessor } from './webhook-delivery.processor';
import { WebhookDispatcher } from './webhook-dispatcher';
import { WebhookInboxController } from './webhook-inbox.controller';
import { WebhookInboxService } from './webhook-inbox.service';
import { WEBHOOKS_QUEUE } from './webhook-queue';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: WEBHOOKS_QUEUE }),
    ShipmentsModule,
  ],
  controllers: [
    ApiKeysController,
    PublicApiController,
    WebhooksController,
    WebhookInboxController,
  ],
  providers: [
    ApiKeysService,
    WebhooksService,
    WebhookInboxService,
    WebhookDispatcher,
    WebhookDeliveryProcessor,
    // Only Prisma behind it, so the inbox can tell demo sellers without the simulator module.
    DemoTenantService,
  ],
  // The admin pulse reads this module's queue counts.
  exports: [BullModule],
})
export class IntegrationsModule {}
