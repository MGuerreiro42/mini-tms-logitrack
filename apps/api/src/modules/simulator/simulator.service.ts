import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { ShipmentStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  ALLOWED_TRANSITIONS,
  TERMINAL_STATUSES,
} from '../shipments/shipment-status.util';
import { ShipmentsService } from '../shipments/shipments.service';
import { TrackingPresence } from '../tracking/tracking-presence';
import { DEMO_ADDRESSES, STATUS_NOTES, toAddressFields } from './demo-dataset';
import {
  DemoTenantService,
  demoShipmentsWhere,
  type LoadedDemoTenant,
} from './demo-tenant.service';
import { type RandomSource, SIMULATOR_RANDOM } from './simulator.constants';

const ACTIVE_SHIPMENT_CAP = 24;
const FAILURE_RATE = 0.08;
const CREATE_CHANCE = 1 / 3;

// Cancelling is the seller's call (DESIGN.md § 14), so the simulator only moves forward.
const forwardTransitions = (status: ShipmentStatus) =>
  ALLOWED_TRANSITIONS[status].filter((to) => to !== ShipmentStatus.CANCELLED);

const ADVANCEABLE_STATUSES = Object.values(ShipmentStatus).filter(
  (status) =>
    status !== ShipmentStatus.PENDING && forwardTransitions(status).length > 0,
);

@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name);
  private warnedMissingTenant = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly shipmentsService: ShipmentsService,
    private readonly presence: TrackingPresence,
    private readonly demoTenantService: DemoTenantService,
    @Inject(SIMULATOR_RANDOM) private readonly random: RandomSource,
  ) {}

  async tick(): Promise<void> {
    if (!(await this.presence.hasViewers())) return;

    const tenant = await this.demoTenantService.load();
    if (!tenant) {
      this.warnMissingTenantOnce();
      return;
    }

    await this.attempt(() => this.advanceOne(tenant));
    await this.attempt(() => this.claimOne(tenant));
    if (this.random() < CREATE_CHANCE) {
      await this.attempt(() => this.createOne(tenant));
    }
  }

  private async advanceOne(tenant: LoadedDemoTenant): Promise<void> {
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        ...demoShipmentsWhere(tenant),
        status: { in: ADVANCEABLE_STATUSES },
        ownerId: { not: null },
      },
      orderBy: { updatedAt: 'asc' },
      select: { id: true, status: true, owner: { select: { userId: true } } },
    });
    if (!shipment?.owner) return;

    const status = this.nextStatus(shipment.status);
    await this.shipmentsService.updateStatus(
      shipment.owner.userId,
      shipment.id,
      { status, note: STATUS_NOTES[status] },
    );
  }

  private async claimOne(tenant: LoadedDemoTenant): Promise<void> {
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        ...demoShipmentsWhere(tenant),
        status: ShipmentStatus.PENDING,
        ownerId: null,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!shipment) return;

    await this.shipmentsService.claim(
      this.pick(tenant.operatorUserIds),
      shipment.id,
    );
  }

  private async createOne(tenant: LoadedDemoTenant): Promise<void> {
    const active = await this.prisma.shipment.count({
      where: {
        ...demoShipmentsWhere(tenant),
        status: { notIn: TERMINAL_STATUSES },
      },
    });
    if (active >= ACTIVE_SHIPMENT_CAP) return;

    await this.shipmentsService.create(this.pick(tenant.sellerUserIds), {
      ...toAddressFields(this.pick(DEMO_ADDRESSES)),
      modalityId: this.pick(Object.values(tenant.modalities)).id,
      carrierId: tenant.carrierId,
    });
  }

  private nextStatus(status: ShipmentStatus): ShipmentStatus {
    if (status === ShipmentStatus.OUT_FOR_DELIVERY) {
      return this.random() < FAILURE_RATE
        ? ShipmentStatus.FAILED_DELIVERY
        : ShipmentStatus.DELIVERED;
    }
    return forwardTransitions(status)[0];
  }

  // A visitor may act on the same shipment first; the domain rejects the loser with 409.
  private async attempt(action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch (error) {
      if (!(error instanceof ConflictException)) throw error;
    }
  }

  private pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.random() * items.length)];
  }

  private warnMissingTenantOnce(): void {
    if (this.warnedMissingTenant) return;
    this.warnedMissingTenant = true;
    this.logger.warn('Demo tenant not found; run the seed with SEED_DEMO=true');
  }
}
