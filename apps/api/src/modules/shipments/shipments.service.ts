import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApprovalStatus,
  CarrierRole,
  type CarrierUser,
  type Prisma,
  type Seller,
  type Shipment,
  ShipmentStatus,
} from '../../../generated/prisma/client';
import {
  type PaginatedResult,
  paginate,
} from '../../shared/pagination/pagination-meta.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { countByStatus, createdSince } from '../../shared/stats/stats';
import { cityKey } from '../../shared/transforms/normalize';
import type {
  AdminShipmentDetailResponseDto,
  AdminShipmentResponseDto,
} from './dto/admin-shipment-response.dto';
import type {
  CarrierShipmentDetailResponseDto,
  CarrierShipmentResponseDto,
} from './dto/carrier-shipment-response.dto';
import type { CreateShipmentDto } from './dto/create-shipment.dto';
import type { EligibleCarrierResponseDto } from './dto/eligible-carrier-response.dto';
import type { PublicTrackingResponseDto } from './dto/public-tracking-response.dto';
import type {
  ReportPositionDto,
  ReportPositionResponseDto,
} from './dto/report-position.dto';
import type { ShipmentActivityResponseDto } from './dto/shipment-activity-response.dto';
import type { ShipmentAttentionResponseDto } from './dto/shipment-attention-response.dto';
import type {
  ShipmentDetailResponseDto,
  ShipmentResponseDto,
} from './dto/shipment-response.dto';
import type { ShipmentStatusCountsResponseDto } from './dto/shipment-status-counts-response.dto';
import type { SlaSummaryItemResponseDto } from './dto/sla-summary-response.dto';
import type { TrackingNoteDto } from './dto/tracking-note.dto';
import type { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { isPublicPosition } from './route-geometry';
import { findRoute, type RoutableShipment, routeSellerInclude } from './routes';
import {
  adminShipmentDetailInclude,
  adminShipmentInclude,
  carrierShipmentDetailInclude,
  carrierShipmentInclude,
  type LiveMap,
  pickAddress,
  sellerShipmentDetailInclude,
  sellerShipmentInclude,
  toAdminShipmentDetailResponseDto,
  toAdminShipmentResponseDto,
  toCarrierShipmentDetailResponseDto,
  toCarrierShipmentResponseDto,
  toPublicLiveMapDto,
  toShipmentActivityResponseDto,
  toShipmentDetailResponseDto,
  toShipmentResponseDto,
} from './shipment.mappers';
import { computeDueAt } from './shipment-due-at';
import {
  SHIPMENT_UPDATED,
  type ShipmentUpdatedEvent,
  VEHICLE_POSITION_REPORTED,
  type VehiclePositionReportedEvent,
} from './shipment-events';
import {
  CANCELLABLE_STATUSES,
  isValidTransition,
  ROAD_STAGES,
} from './shipment-status.util';
import { generateTrackingCode } from './tracking-code';
import { POSITION_MAX_AGE_MS, VehiclePositions } from './vehicle-positions';

const eligibleCarrierWhere = (
  state: string,
  city: string,
  modalityId: string,
): Prisma.CarrierWhereInput => ({
  status: ApprovalStatus.APPROVED,
  coverageAreas: {
    some: {
      state,
      OR: [{ cityKey: null }, { cityKey: cityKey(city) }],
    },
  },
  modalities: { some: { modalityId } },
});

const ATTENTION_LIMIT = 5;

// Device clocks drift; anything further ahead would outrank every honest ping until then.
const POSITION_MAX_LEAD_MS = 5_000;

// Open and still on the clock: FAILED_DELIVERY is reported on its own, ahead of late ones.
const LATE_CANDIDATES: ShipmentStatus[] = [
  ShipmentStatus.PENDING,
  ShipmentStatus.ACCEPTED,
  ShipmentStatus.COLLECTED,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.OUT_FOR_DELIVERY,
];

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly vehiclePositions: VehiclePositions,
  ) {}

  async findEligibleCarriers(
    state: string,
    city: string,
    modalityId: string,
  ): Promise<EligibleCarrierResponseDto[]> {
    return this.prisma.carrier.findMany({
      where: eligibleCarrierWhere(state, city, modalityId),
      select: { id: true, companyName: true },
      orderBy: { companyName: 'asc' },
    });
  }

  async findPublicByTrackingCode(
    trackingCode: string,
  ): Promise<PublicTrackingResponseDto> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { trackingCode },
      include: {
        modality: { select: { name: true } },
        trackingEvents: { orderBy: { createdAt: 'asc' } },
        carrier: { select: { companyName: true } },
        seller: {
          select: { companyName: true, ...routeSellerInclude.seller.select },
        },
      },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return {
      trackingCode: shipment.trackingCode,
      status: shipment.status,
      addressCity: shipment.addressCity,
      addressState: shipment.addressState,
      modalityName: shipment.modality.name,
      sellerName: shipment.seller.companyName,
      carrierName: shipment.carrier.companyName,
      events: shipment.trackingEvents.map((event) => ({
        status: event.status,
        createdAt: event.createdAt,
      })),
      ...toPublicLiveMapDto(await this.liveMap(shipment), shipment.status),
    };
  }

  async create(
    userId: string,
    dto: CreateShipmentDto,
  ): Promise<ShipmentResponseDto> {
    const seller = await this.findSellerOrThrow(userId);
    if (seller.status !== ApprovalStatus.APPROVED) {
      throw new BadRequestException(
        'Only an approved seller can create shipments',
      );
    }

    // Re-validate the eligible-carriers preview: nothing forces the client to have used it.
    const [sellerModality, carrier] = await Promise.all([
      this.prisma.sellerModality.findUnique({
        where: {
          sellerId_modalityId: {
            sellerId: seller.id,
            modalityId: dto.modalityId,
          },
        },
        include: { modality: { select: { slaHours: true } } },
      }),
      this.prisma.carrier.findFirst({
        where: {
          id: dto.carrierId,
          ...eligibleCarrierWhere(
            dto.addressState,
            dto.addressCity,
            dto.modalityId,
          ),
        },
      }),
    ]);

    if (!sellerModality) {
      throw new BadRequestException(
        'This modality is not enabled for the seller',
      );
    }
    if (!carrier) {
      throw new BadRequestException(
        'This carrier does not cover the address or does not offer the chosen modality',
      );
    }

    const createdAt = new Date();
    const shipment = await this.prisma.shipment.create({
      data: {
        trackingCode: generateTrackingCode(),
        sellerId: seller.id,
        carrierId: dto.carrierId,
        modalityId: dto.modalityId,
        ...pickAddress(dto),
        createdAt,
        dueAt: computeDueAt(createdAt, sellerModality.modality.slaHours),
        trackingEvents: {
          create: {
            status: ShipmentStatus.PENDING,
            actorId: userId,
            createdAt,
          },
        },
      },
      include: sellerShipmentInclude,
    });

    this.emitUpdated(shipment, null);

    return toShipmentResponseDto(shipment);
  }

  async findAllForSeller(
    userId: string,
    status?: ShipmentStatus,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<ShipmentResponseDto>> {
    const seller = await this.findSellerOrThrow(userId);

    return this.findShipmentPage(
      { sellerId: seller.id, ...(status ? { status } : {}) },
      sellerShipmentInclude,
      toShipmentResponseDto,
      page,
      limit,
    );
  }

  async countsByStatusForSeller(
    userId: string,
  ): Promise<ShipmentStatusCountsResponseDto> {
    const seller = await this.findSellerOrThrow(userId);
    return this.countByStatus({ sellerId: seller.id });
  }

  countsByStatusForAdmin(
    carrierId?: string,
    sellerId?: string,
  ): Promise<ShipmentStatusCountsResponseDto> {
    return this.countByStatus({
      ...(carrierId ? { carrierId } : {}),
      ...(sellerId ? { sellerId } : {}),
    });
  }

  private async countByStatus(
    where: Prisma.ShipmentWhereInput,
  ): Promise<ShipmentStatusCountsResponseDto> {
    const groups = await this.prisma.shipment.groupBy({
      by: ['status'],
      where,
      _count: true,
    });
    return countByStatus(ShipmentStatus, groups);
  }

  // Only DELIVERED shipments have an outcome; modalities without slaHours are skipped, not counted as misses.
  async slaSummaryForSeller(
    userId: string,
    since?: Date,
  ): Promise<SlaSummaryItemResponseDto[]> {
    const seller = await this.findSellerOrThrow(userId);

    const shipments = await this.prisma.shipment.findMany({
      where: {
        sellerId: seller.id,
        status: ShipmentStatus.DELIVERED,
        ...createdSince(since),
      },
      select: {
        dueAt: true,
        deliveredAt: true,
        modality: { select: { code: true, name: true } },
      },
    });

    const byModality = new Map<
      string,
      { modalityName: string; deliveredCount: number; onTimeCount: number }
    >();

    for (const { dueAt, deliveredAt, modality } of shipments) {
      if (!dueAt || !deliveredAt) continue;

      const entry = byModality.get(modality.code) ?? {
        modalityName: modality.name,
        deliveredCount: 0,
        onTimeCount: 0,
      };
      entry.deliveredCount += 1;

      if (deliveredAt <= dueAt) {
        entry.onTimeCount += 1;
      }

      byModality.set(modality.code, entry);
    }

    return Array.from(byModality.entries()).map(([modalityCode, entry]) => ({
      modalityCode,
      modalityName: entry.modalityName,
      deliveredCount: entry.deliveredCount,
      onTimeCount: entry.onTimeCount,
      onTimeRate: (entry.onTimeCount / entry.deliveredCount) * 100,
    }));
  }

  async attentionForSeller(
    userId: string,
  ): Promise<ShipmentAttentionResponseDto> {
    const seller = await this.findSellerOrThrow(userId);
    const failedWhere = {
      sellerId: seller.id,
      status: ShipmentStatus.FAILED_DELIVERY,
    };

    const lateWhere = {
      sellerId: seller.id,
      status: { in: LATE_CANDIDATES },
      dueAt: { lt: new Date() },
    };

    const [failed, failedCount, late, lateCount] = await Promise.all([
      this.prisma.shipment.findMany({
        where: failedWhere,
        include: sellerShipmentInclude,
        orderBy: { updatedAt: 'desc' },
        take: ATTENTION_LIMIT,
      }),
      this.prisma.shipment.count({ where: failedWhere }),
      this.prisma.shipment.findMany({
        where: lateWhere,
        include: sellerShipmentInclude,
        orderBy: { dueAt: 'asc' },
        take: ATTENTION_LIMIT,
      }),
      this.prisma.shipment.count({ where: lateWhere }),
    ]);

    return {
      shipments: [
        ...failed,
        ...late.slice(0, ATTENTION_LIMIT - failed.length),
      ].map(toShipmentResponseDto),
      counts: { failed: failedCount, late: lateCount },
    };
  }

  async activityForSeller(
    userId: string,
    limit: number,
  ): Promise<ShipmentActivityResponseDto[]> {
    const seller = await this.findSellerOrThrow(userId);
    const events = await this.prisma.trackingEvent.findMany({
      where: { shipment: { sellerId: seller.id } },
      select: {
        id: true,
        status: true,
        createdAt: true,
        shipment: {
          select: { id: true, trackingCode: true, addressCity: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return events.map(toShipmentActivityResponseDto);
  }

  async findOneForSeller(
    userId: string,
    id: string,
  ): Promise<ShipmentDetailResponseDto> {
    const seller = await this.findSellerOrThrow(userId);

    // Scoped in the query: another seller's shipment is a 404, indistinguishable from a missing one.
    const shipment = await this.prisma.shipment.findFirst({
      where: { id, sellerId: seller.id },
      include: sellerShipmentDetailInclude,
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return toShipmentDetailResponseDto(shipment, await this.liveMap(shipment));
  }

  async cancel(
    userId: string,
    shipmentId: string,
    dto: TrackingNoteDto,
  ): Promise<ShipmentResponseDto> {
    const seller = await this.findSellerOrThrow(userId);
    try {
      return await this.cancelOnce(seller, shipmentId, dto);
    } catch (error) {
      if (!(error instanceof ConflictException)) throw error;
      // A claim may land between the read and the write; ACCEPTED is still cancellable, so read again once.
      return this.cancelOnce(seller, shipmentId, dto);
    }
  }

  private async cancelOnce(
    seller: Pick<Seller, 'id' | 'userId'>,
    shipmentId: string,
    dto: TrackingNoteDto,
  ): Promise<ShipmentResponseDto> {
    const sellerId = seller.id;
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, sellerId },
      select: { status: true },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    if (!CANCELLABLE_STATUSES.includes(shipment.status)) {
      throw new ConflictException(
        `Cannot cancel a shipment that is ${shipment.status}`,
      );
    }

    const updated = await this.transitionWithEvent({
      shipmentId,
      from: shipment.status,
      expected: { sellerId },
      to: ShipmentStatus.CANCELLED,
      actorId: seller.userId,
      note: dto.note,
      conflictMessage:
        'Shipment status changed concurrently, reload and try again',
      include: sellerShipmentInclude,
    });
    return toShipmentResponseDto(updated);
  }

  private async findCarrierUserOrThrow(userId: string) {
    const carrierUser = await this.prisma.carrierUser.findUnique({
      where: { userId },
      include: { carrier: { select: { status: true } } },
    });
    if (!carrierUser) {
      throw new NotFoundException('Carrier not found');
    }
    if (carrierUser.carrier.status !== ApprovalStatus.APPROVED) {
      throw new ForbiddenException('Carrier is not approved to operate');
    }
    return carrierUser;
  }

  private async findCarrierShipmentOrThrow(carrierId: string, id: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id, carrierId },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    return shipment;
  }

  async findAllForCarrier(
    userId: string,
    status?: ShipmentStatus,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<CarrierShipmentResponseDto>> {
    const carrierUser = await this.findCarrierUserOrThrow(userId);

    return this.findShipmentPage(
      {
        carrierId: carrierUser.carrierId,
        ...(status ? { status } : {}),
      },
      carrierShipmentInclude,
      toCarrierShipmentResponseDto,
      page,
      limit,
    );
  }

  async findAllForAdmin(
    status?: ShipmentStatus,
    carrierId?: string,
    sellerId?: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<AdminShipmentResponseDto>> {
    return this.findShipmentPage(
      {
        ...(status ? { status } : {}),
        ...(carrierId ? { carrierId } : {}),
        ...(sellerId ? { sellerId } : {}),
      },
      adminShipmentInclude,
      toAdminShipmentResponseDto,
      page,
      limit,
    );
  }

  async findOneForAdmin(id: string): Promise<AdminShipmentDetailResponseDto> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: adminShipmentDetailInclude,
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    return toAdminShipmentDetailResponseDto(shipment);
  }

  async findOneForCarrier(
    userId: string,
    id: string,
  ): Promise<CarrierShipmentDetailResponseDto> {
    const carrierUser = await this.findCarrierUserOrThrow(userId);

    const shipment = await this.prisma.shipment.findFirst({
      where: { id, carrierId: carrierUser.carrierId },
      include: carrierShipmentDetailInclude,
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return toCarrierShipmentDetailResponseDto(
      shipment,
      await this.liveMap(shipment),
    );
  }

  async claim(
    userId: string,
    shipmentId: string,
  ): Promise<CarrierShipmentResponseDto> {
    const carrierUser = await this.findCarrierUserOrThrow(userId);
    const shipment = await this.findCarrierShipmentOrThrow(
      carrierUser.carrierId,
      shipmentId,
    );
    if (shipment.ownerId) {
      throw new ConflictException('Shipment has already been claimed');
    }
    if (shipment.status !== ShipmentStatus.PENDING) {
      throw new ConflictException(
        `Cannot claim a shipment that is ${shipment.status}`,
      );
    }

    // Concurrent claims or a seller cancel can race this; the WHERE lets Postgres pick one winner.
    const updated = await this.transitionWithEvent({
      shipmentId,
      from: ShipmentStatus.PENDING,
      expected: { carrierId: carrierUser.carrierId, ownerId: null },
      to: ShipmentStatus.ACCEPTED,
      actorId: userId,
      data: { ownerId: carrierUser.id },
      conflictMessage: 'Shipment is no longer available to claim',
      include: carrierShipmentInclude,
    });
    return toCarrierShipmentResponseDto(updated);
  }

  async updateStatus(
    userId: string,
    shipmentId: string,
    dto: UpdateShipmentStatusDto,
  ): Promise<CarrierShipmentResponseDto> {
    if (dto.status === ShipmentStatus.CANCELLED) {
      throw new ForbiddenException('Only the seller can cancel a shipment');
    }

    const carrierUser = await this.findCarrierUserOrThrow(userId);
    const shipment = await this.findCarrierShipmentOrThrow(
      carrierUser.carrierId,
      shipmentId,
    );

    // Managers bypass ownership, so without this they could ACCEPT an unowned shipment.
    if (shipment.status === ShipmentStatus.PENDING) {
      throw new BadRequestException(
        'Pending shipments must be claimed via PATCH /shipments/:id/claim, not updated directly',
      );
    }

    this.assertOwnerOrManager(carrierUser, shipment, 'update its status');

    if (!isValidTransition(shipment.status, dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${shipment.status} to ${dto.status}`,
      );
    }

    const updated = await this.transitionWithEvent({
      shipmentId,
      from: shipment.status,
      to: dto.status,
      actorId: userId,
      note: dto.note,
      conflictMessage: `Shipment status changed concurrently — expected ${shipment.status}, reload and try again`,
      include: carrierShipmentInclude,
    });
    return toCarrierShipmentResponseDto(updated);
  }

  async reportPosition(
    userId: string,
    shipmentId: string,
    dto: ReportPositionDto,
  ): Promise<ReportPositionResponseDto> {
    // Checked first, like the DTO: a reading outside the window is invalid whoever sends it.
    const age = Date.now() - dto.recordedAt.getTime();
    if (age > POSITION_MAX_AGE_MS || age < -POSITION_MAX_LEAD_MS) {
      throw new BadRequestException(
        `recordedAt must be at most ${POSITION_MAX_AGE_MS / 60_000} minutes old and ${POSITION_MAX_LEAD_MS / 1000} seconds ahead`,
      );
    }

    const carrierUser = await this.findCarrierUserOrThrow(userId);
    const shipment = await this.findCarrierShipmentOrThrow(
      carrierUser.carrierId,
      shipmentId,
    );
    this.assertOwnerOrManager(carrierUser, shipment, 'report its position');
    if (!ROAD_STAGES.includes(shipment.status)) {
      throw new ConflictException(
        `Cannot report a position for a shipment that is ${shipment.status}`,
      );
    }

    const position = {
      lat: dto.lat,
      lng: dto.lng,
      heading: dto.heading ?? null,
      recordedAt: dto.recordedAt,
    };
    const applied = await this.vehiclePositions.saveIfNewer(
      shipment.id,
      position,
    );
    if (!applied) return { applied };

    // A status change can land between the check and the write: the fresh status decides the broadcast.
    const current = await this.prisma.shipment.findUnique({
      where: { id: shipment.id },
      select: {
        status: true,
        addressZipCode: true,
        addressNumber: true,
        ...routeSellerInclude,
      },
    });
    if (current && ROAD_STAGES.includes(current.status)) {
      const event: VehiclePositionReportedEvent = {
        shipmentId: shipment.id,
        carrierId: shipment.carrierId,
        sellerId: shipment.sellerId,
        trackingCode: shipment.trackingCode,
        status: current.status,
        ...position,
        publiclyVisible: isPublicPosition(
          findRoute(current),
          current.status,
          position,
        ),
      };
      this.eventEmitter.emit(VEHICLE_POSITION_REPORTED, event);
    }
    return { applied };
  }

  // The stored position outlives the stage by up to its expiry; off the road it is never shown.
  private async liveMap(
    shipment: RoutableShipment & Pick<Shipment, 'id' | 'status'>,
  ): Promise<LiveMap> {
    return {
      route: findRoute(shipment),
      lastPosition: ROAD_STAGES.includes(shipment.status)
        ? await this.latestPosition(shipment.id)
        : null,
    };
  }

  // Best effort: with Redis down the detail and the tracking page still render, without the vehicle.
  private async latestPosition(shipmentId: string) {
    try {
      return await this.vehiclePositions.latest(shipmentId);
    } catch (error) {
      this.logger.warn(
        `Could not read the position of shipment ${shipmentId}: ${String(error)}`,
      );
      return null;
    }
  }

  private assertOwnerOrManager(
    carrierUser: Pick<CarrierUser, 'id' | 'role'>,
    shipment: Pick<Shipment, 'ownerId'>,
    action: string,
  ): void {
    const isOwner = shipment.ownerId === carrierUser.id;
    const isManager = carrierUser.role === CarrierRole.MANAGER;
    if (!isOwner && !isManager) {
      throw new ForbiddenException(
        `Only the shipment owner or the carrier manager can ${action}`,
      );
    }
  }

  // Conditional write + timeline event in one transaction; 0 rows matched means someone else won (409).
  private async transitionWithEvent<I extends Prisma.ShipmentInclude>(params: {
    shipmentId: string;
    from: ShipmentStatus;
    expected?: Prisma.ShipmentWhereInput;
    to: ShipmentStatus;
    actorId: string;
    data?: Prisma.ShipmentUncheckedUpdateManyInput;
    note?: string;
    conflictMessage: string;
    include: I;
  }): Promise<Prisma.ShipmentGetPayload<{ include: I }>> {
    const { shipmentId, from, to, actorId } = params;
    const createdAt = new Date();
    const written = await this.prisma.$transaction(async (tx) => {
      const [shipment] = await tx.shipment.updateManyAndReturn({
        where: { id: shipmentId, ...params.expected, status: from },
        data: {
          ...params.data,
          status: to,
          ...(to === ShipmentStatus.DELIVERED && { deliveredAt: createdAt }),
        },
      });
      if (!shipment) {
        throw new ConflictException(params.conflictMessage);
      }
      await tx.trackingEvent.create({
        data: { shipmentId, status: to, note: params.note, actorId, createdAt },
      });
      return shipment;
    });

    // Relations load after commit: an include inside the transaction runs concurrent queries on its single pg client.
    const withRelations = await this.prisma.shipment.findUniqueOrThrow({
      where: { id: shipmentId },
      include: params.include,
    });
    // The written row wins: a transition landing between commit and re-read must not replace the status this request reports and emits.
    const updated = { ...withRelations, ...written };
    this.emitUpdated(updated, from);
    return updated;
  }

  private async findShipmentPage<I extends Prisma.ShipmentInclude, R>(
    where: Prisma.ShipmentWhereInput,
    include: I,
    toDto: (shipment: Prisma.ShipmentGetPayload<{ include: I }>) => R,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<R>> {
    const [shipments, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.shipment.count({ where }),
    ]);
    return paginate(shipments.map(toDto), total, page, limit);
  }

  private async findSellerOrThrow(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }
    return seller;
  }

  private emitUpdated(
    shipment: Pick<
      Shipment,
      'id' | 'carrierId' | 'sellerId' | 'status' | 'trackingCode'
    >,
    previousStatus: ShipmentStatus | null,
  ): void {
    const event: ShipmentUpdatedEvent = {
      shipmentId: shipment.id,
      carrierId: shipment.carrierId,
      sellerId: shipment.sellerId,
      status: shipment.status,
      previousStatus,
      trackingCode: shipment.trackingCode,
    };
    this.eventEmitter.emit(SHIPMENT_UPDATED, event);
  }
}
