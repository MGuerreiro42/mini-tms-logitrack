import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Redis } from 'ioredis';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { REDIS_CLIENT } from '../../shared/redis/redis.module';
import { MS_PER_HOUR } from '../../shared/stats/stats';
import { buildDemoShipments } from './demo-dataset';
import { DEMO_RESET } from './demo-events';
import { DemoTenantService } from './demo-tenant.service';

export const LAST_RESET_KEY = 'demo:last-reset';
const RESET_MAX_AGE_MS = 24 * MS_PER_HOUR;

@Injectable()
export class DemoResetService {
  private readonly logger = new Logger(DemoResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly demoTenantService: DemoTenantService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async reset(): Promise<void> {
    const tenant = await this.demoTenantService.load();
    if (!tenant) {
      this.logger.warn('Demo reset skipped: the demo tenant was never seeded');
      return;
    }

    // By seller alone: visitor-created shipments on the demo accounts go too, whatever carrier they picked.
    const demoSellerShipments = { sellerId: { in: [...tenant.sellerIds] } };
    const shipments = buildDemoShipments(tenant, Date.now()).map((demo) => ({
      ...demo,
      id: randomUUID(),
    }));
    // Ids are generated here so the whole reset is four statements in one batch.
    await this.prisma.$transaction([
      this.prisma.trackingEvent.deleteMany({
        where: { shipment: demoSellerShipments },
      }),
      this.prisma.shipment.deleteMany({ where: demoSellerShipments }),
      this.prisma.shipment.createMany({
        data: shipments.map(({ id, shipment }) => ({ ...shipment, id })),
      }),
      this.prisma.trackingEvent.createMany({
        data: shipments.flatMap(({ id, events }) =>
          events.map((event) => ({ ...event, shipmentId: id })),
        ),
      }),
    ]);

    await this.redis.set(LAST_RESET_KEY, Date.now());
    this.eventEmitter.emit(DEMO_RESET);
    this.logger.log(`Demo tenant reset with ${shipments.length} shipments`);
  }

  async isOverdue(): Promise<boolean> {
    const lastReset = await this.redis.get(LAST_RESET_KEY);
    return !lastReset || Date.now() - Number(lastReset) > RESET_MAX_AGE_MS;
  }
}
