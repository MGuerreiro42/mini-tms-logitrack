import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { type Prisma, ShipmentStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { pointAt, segmentFor } from '../shipments/route-geometry';
import { findRoute, routeSellerInclude } from '../shipments/routes';
import {
  ALLOWED_TRANSITIONS,
  ROAD_STAGES,
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
import {
  type RandomSource,
  SIMULATOR_RANDOM,
  STAGE_DURATION_MS,
} from './simulator.constants';

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

// The latest TrackingEvent marks when the current stage started.
const stageStart = {
  trackingEvents: {
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 1,
  },
} satisfies Prisma.ShipmentSelect;

interface StagedShipment {
  status: ShipmentStatus;
  trackingEvents: { createdAt: Date }[];
}

const stageStartedAt = (shipment: StagedShipment) =>
  shipment.trackingEvents[0]?.createdAt.getTime() ?? 0;

// When the vehicle reaches the end of its road stage.
const readyAt = (shipment: StagedShipment) =>
  stageStartedAt(shipment) + (STAGE_DURATION_MS[shipment.status] ?? 0);

const stageProgress = (shipment: StagedShipment, now: number) => {
  const duration = STAGE_DURATION_MS[shipment.status];
  if (!duration) return 1;
  return Math.min(Math.max((now - stageStartedAt(shipment)) / duration, 0), 1);
};

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
    const tenant = await this.watchedTenant();
    if (!tenant) return;

    await this.advanceReady(tenant);
    await this.attempt(() => this.claimOne(tenant));
    if (this.random() < CREATE_CHANCE) {
      await this.attempt(() => this.createOne(tenant));
    }
  }

  // Plays the driver: reports where each road-stage shipment is, as its owner would from the road.
  async drive(): Promise<void> {
    const tenant = await this.watchedTenant();
    if (!tenant) return;

    const shipments = await this.prisma.shipment.findMany({
      where: {
        ...demoShipmentsWhere(tenant),
        status: { in: ROAD_STAGES },
        ownerId: { not: null },
      },
      select: {
        id: true,
        status: true,
        addressZipCode: true,
        addressNumber: true,
        ...routeSellerInclude,
        owner: { select: { userId: true } },
        ...stageStart,
      },
    });
    const now = Date.now();
    for (const shipment of shipments) {
      const route = findRoute(shipment);
      if (!route || !shipment.owner) continue;
      const { userId } = shipment.owner;
      const position = pointAt(
        segmentFor(route, shipment.status),
        stageProgress(shipment, now),
      );
      try {
        await this.shipmentsService.reportPosition(userId, shipment.id, {
          ...position,
          recordedAt: new Date(now),
        });
      } catch (error) {
        // One failing shipment must not park every vehicle behind it; a lost race stays silent.
        if (error instanceof ConflictException) continue;
        this.logger.warn(`Could not drive shipment ${shipment.id}: ${error}`);
      }
    }
  }

  private async watchedTenant(): Promise<LoadedDemoTenant | null> {
    if (!(await this.presence.hasViewers())) return null;

    const tenant = await this.demoTenantService.load();
    if (!tenant) this.warnMissingTenantOnce();
    return tenant;
  }

  // Every vehicle that has arrived ends its road stage, so none waits parked at the end of its
  // segment; off the road, the shipment that has waited longest moves one step.
  private async advanceReady(tenant: LoadedDemoTenant): Promise<void> {
    const candidates = await this.prisma.shipment.findMany({
      where: {
        ...demoShipmentsWhere(tenant),
        status: { in: ADVANCEABLE_STATUSES },
        ownerId: { not: null },
      },
      select: {
        id: true,
        status: true,
        owner: { select: { userId: true } },
        ...stageStart,
      },
    });
    const now = Date.now();
    const arrived = candidates.filter(
      (candidate) =>
        ROAD_STAGES.includes(candidate.status) && readyAt(candidate) <= now,
    );
    const [longestWaiting] = candidates
      .filter((candidate) => !ROAD_STAGES.includes(candidate.status))
      .sort((a, b) => stageStartedAt(a) - stageStartedAt(b));

    for (const shipment of [...arrived, longestWaiting]) {
      if (shipment?.owner) {
        const { userId } = shipment.owner;
        const status = this.nextStatus(shipment.status);
        await this.attempt(() =>
          this.shipmentsService.updateStatus(userId, shipment.id, {
            status,
            note: STATUS_NOTES[status],
          }),
        );
      }
    }
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
  private async attempt(action: () => Promise<unknown>): Promise<void> {
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
