import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApprovalStatus,
  CarrierRole,
  type Shipment,
  ShipmentStatus,
} from '../../../generated/prisma/client';
import {
  type PaginatedResult,
  paginate,
} from '../../shared/pagination/pagination-meta.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { countByStatus, hoursBetween } from '../../shared/stats/stats';
import type { AdminShipmentResponseDto } from './dto/admin-shipment-response.dto';
import type {
  CarrierShipmentDetailResponseDto,
  CarrierShipmentResponseDto,
} from './dto/carrier-shipment-response.dto';
import type { CreateShipmentDto } from './dto/create-shipment.dto';
import type { EligibleCarrierResponseDto } from './dto/eligible-carrier-response.dto';
import type { PublicTrackingResponseDto } from './dto/public-tracking-response.dto';
import type { ShipmentResponseDto } from './dto/shipment-response.dto';
import type { ShipmentStatusCountsResponseDto } from './dto/shipment-status-counts-response.dto';
import type { SlaSummaryItemResponseDto } from './dto/sla-summary-response.dto';
import type { TrackingNoteDto } from './dto/tracking-note.dto';
import type { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import {
  adminShipmentInclude,
  carrierShipmentDetailInclude,
  carrierShipmentInclude,
  pickAddress,
  sellerShipmentDetailInclude,
  sellerShipmentInclude,
  toAdminShipmentResponseDto,
  toCarrierShipmentDetailResponseDto,
  toCarrierShipmentResponseDto,
  toShipmentDetailResponseDto,
  toShipmentResponseDto,
} from './shipment.mappers';
import {
  SHIPMENT_STATUS_CHANGED,
  type ShipmentStatusChangedEvent,
} from './shipment-events';
import {
  CANCELLABLE_STATUSES,
  isValidTransition,
} from './shipment-status.util';
import { generateTrackingCode } from './tracking-code';

@Injectable()
export class ShipmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findEligibleCarriers(
    state: string,
    city: string,
    modalityId: string,
  ): Promise<EligibleCarrierResponseDto[]> {
    return this.prisma.carrier.findMany({
      where: {
        status: ApprovalStatus.APPROVED,
        coverageAreas: {
          some: {
            // `state` is uppercased at the DTO boundary; `city` keeps display casing, hence insensitive.
            state,
            OR: [
              { city: null },
              { city: { equals: city, mode: 'insensitive' } },
            ],
          },
        },
        modalities: { some: { modalityId } },
      },
      select: { id: true, companyName: true },
      orderBy: { companyName: 'asc' },
    });
  }

  // Same 404 for unknown and mistyped codes, on purpose.
  async findPublicByTrackingCode(
    trackingCode: string,
  ): Promise<PublicTrackingResponseDto> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { trackingCode },
      include: {
        modality: { select: { name: true } },
        trackingEvents: { orderBy: { createdAt: 'asc' } },
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
      events: shipment.trackingEvents.map((event) => ({
        status: event.status,
        createdAt: event.createdAt,
      })),
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
      }),
      this.prisma.carrier.findFirst({
        where: {
          id: dto.carrierId,
          status: ApprovalStatus.APPROVED,
          coverageAreas: {
            some: {
              state: dto.addressState,
              OR: [
                { city: null },
                { city: { equals: dto.addressCity, mode: 'insensitive' } },
              ],
            },
          },
          modalities: { some: { modalityId: dto.modalityId } },
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

    const shipment = await this.prisma.shipment.create({
      data: {
        trackingCode: generateTrackingCode(),
        sellerId: seller.id,
        carrierId: dto.carrierId,
        modalityId: dto.modalityId,
        ...pickAddress(dto),
        trackingEvents: { create: { status: ShipmentStatus.PENDING } },
      },
      include: sellerShipmentInclude,
    });

    this.emitStatusChanged(shipment);

    return toShipmentResponseDto(shipment);
  }

  async findAllForSeller(
    userId: string,
    status?: ShipmentStatus,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<ShipmentResponseDto>> {
    const seller = await this.findSellerOrThrow(userId);

    const where = { sellerId: seller.id, ...(status ? { status } : {}) };
    const [shipments, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        include: sellerShipmentInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return paginate(shipments.map(toShipmentResponseDto), total, page, limit);
  }

  async countsByStatusForSeller(
    userId: string,
  ): Promise<ShipmentStatusCountsResponseDto> {
    const seller = await this.findSellerOrThrow(userId);

    const groups = await this.prisma.shipment.groupBy({
      by: ['status'],
      where: { sellerId: seller.id },
      _count: true,
    });

    return countByStatus(ShipmentStatus, groups);
  }

  // Only DELIVERED shipments have an outcome; modalities without slaHours are skipped, not counted as misses.
  async slaSummaryForSeller(
    userId: string,
  ): Promise<SlaSummaryItemResponseDto[]> {
    const seller = await this.findSellerOrThrow(userId);

    const shipments = await this.prisma.shipment.findMany({
      where: { sellerId: seller.id, status: ShipmentStatus.DELIVERED },
      select: {
        createdAt: true,
        modality: { select: { code: true, name: true, slaHours: true } },
        trackingEvents: {
          where: { status: ShipmentStatus.DELIVERED },
          select: { createdAt: true },
          take: 1,
        },
      },
    });

    const byModality = new Map<
      string,
      { modalityName: string; deliveredCount: number; onTimeCount: number }
    >();

    for (const shipment of shipments) {
      if (shipment.modality.slaHours == null) continue;

      const deliveredEvent = shipment.trackingEvents[0];
      if (!deliveredEvent) continue;

      const entry = byModality.get(shipment.modality.code) ?? {
        modalityName: shipment.modality.name,
        deliveredCount: 0,
        onTimeCount: 0,
      };
      entry.deliveredCount += 1;

      const elapsedHours = hoursBetween(
        shipment.createdAt,
        deliveredEvent.createdAt,
      );
      if (elapsedHours <= shipment.modality.slaHours) {
        entry.onTimeCount += 1;
      }

      byModality.set(shipment.modality.code, entry);
    }

    return Array.from(byModality.entries()).map(([modalityCode, entry]) => ({
      modalityCode,
      modalityName: entry.modalityName,
      deliveredCount: entry.deliveredCount,
      onTimeCount: entry.onTimeCount,
      onTimeRate: (entry.onTimeCount / entry.deliveredCount) * 100,
    }));
  }

  async findOneForSeller(
    userId: string,
    id: string,
  ): Promise<ShipmentResponseDto> {
    const seller = await this.findSellerOrThrow(userId);

    // Scoped in the query: another seller's shipment is a 404, indistinguishable from a missing one.
    const shipment = await this.prisma.shipment.findFirst({
      where: { id, sellerId: seller.id },
      include: sellerShipmentDetailInclude,
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return toShipmentDetailResponseDto(shipment);
  }

  async cancel(
    userId: string,
    shipmentId: string,
    dto: TrackingNoteDto,
  ): Promise<ShipmentResponseDto> {
    const seller = await this.findSellerOrThrow(userId);
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, sellerId: seller.id },
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

    // Same compare-and-set as claim(): a carrier advancing it concurrently makes this a 409.
    const cancelled = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.shipment.updateMany({
        where: {
          id: shipmentId,
          sellerId: seller.id,
          status: { in: CANCELLABLE_STATUSES },
        },
        data: { status: ShipmentStatus.CANCELLED },
      });
      if (count === 0) {
        return false;
      }
      await tx.trackingEvent.create({
        data: { shipmentId, status: ShipmentStatus.CANCELLED, note: dto.note },
      });
      return true;
    });

    if (!cancelled) {
      throw new ConflictException(
        'Shipment status changed concurrently, reload and try again',
      );
    }

    const updated = await this.prisma.shipment.findUniqueOrThrow({
      where: { id: shipmentId },
      include: sellerShipmentInclude,
    });

    this.emitStatusChanged(updated);

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

    const where = {
      carrierId: carrierUser.carrierId,
      ...(status ? { status } : {}),
    };
    const [shipments, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        include: carrierShipmentInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return paginate(
      shipments.map(toCarrierShipmentResponseDto),
      total,
      page,
      limit,
    );
  }

  // Unscoped on purpose: admin-only global monitoring, gated by @Roles(ADMIN).
  async findAllForAdmin(
    status?: ShipmentStatus,
    carrierId?: string,
    sellerId?: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<AdminShipmentResponseDto>> {
    const where = {
      ...(status ? { status } : {}),
      ...(carrierId ? { carrierId } : {}),
      ...(sellerId ? { sellerId } : {}),
    };
    const [shipments, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        include: adminShipmentInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return paginate(
      shipments.map(toAdminShipmentResponseDto),
      total,
      page,
      limit,
    );
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

    return toCarrierShipmentDetailResponseDto(shipment);
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
    // Friendly pre-check only; the conditional updateMany below is the real guard.
    if (shipment.ownerId) {
      throw new ConflictException('Shipment has already been claimed');
    }
    if (shipment.status !== ShipmentStatus.PENDING) {
      throw new ConflictException(
        `Cannot claim a shipment that is ${shipment.status}`,
      );
    }

    // Concurrent claims or a seller cancel can race this; the WHERE lets Postgres pick one winner.
    const claimed = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.shipment.updateMany({
        where: {
          id: shipmentId,
          ownerId: null,
          status: ShipmentStatus.PENDING,
        },
        data: { ownerId: carrierUser.id, status: ShipmentStatus.ACCEPTED },
      });
      if (count === 0) {
        return false;
      }
      await tx.trackingEvent.create({
        data: { shipmentId, status: ShipmentStatus.ACCEPTED },
      });
      return true;
    });

    if (!claimed) {
      throw new ConflictException('Shipment is no longer available to claim');
    }

    const updated = await this.prisma.shipment.findUniqueOrThrow({
      where: { id: shipmentId },
      include: carrierShipmentInclude,
    });

    this.emitStatusChanged(updated);

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

    // Managers may act on any shipment of their carrier; operators only on their own.
    const isOwner = shipment.ownerId === carrierUser.id;
    const isManager = carrierUser.role === CarrierRole.MANAGER;
    if (!isOwner && !isManager) {
      throw new ForbiddenException(
        'Only the shipment owner or the carrier manager can update its status',
      );
    }

    if (!isValidTransition(shipment.status, dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${shipment.status} to ${dto.status}`,
      );
    }

    // Compare-and-set on the validated status so concurrent advances can't both write.
    const advanced = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.shipment.updateMany({
        where: { id: shipmentId, status: shipment.status },
        data: { status: dto.status },
      });
      if (count === 0) {
        return false;
      }
      await tx.trackingEvent.create({
        data: { shipmentId, status: dto.status, note: dto.note },
      });
      return true;
    });

    if (!advanced) {
      throw new ConflictException(
        `Shipment status changed concurrently — expected ${shipment.status}, reload and try again`,
      );
    }

    const updated = await this.prisma.shipment.findUniqueOrThrow({
      where: { id: shipmentId },
      include: carrierShipmentInclude,
    });

    this.emitStatusChanged(updated);

    return toCarrierShipmentResponseDto(updated);
  }

  private async findSellerOrThrow(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }
    return seller;
  }

  private emitStatusChanged(
    shipment: Pick<
      Shipment,
      'id' | 'carrierId' | 'sellerId' | 'status' | 'trackingCode'
    >,
  ): void {
    const event: ShipmentStatusChangedEvent = {
      shipmentId: shipment.id,
      carrierId: shipment.carrierId,
      sellerId: shipment.sellerId,
      status: shipment.status,
      trackingCode: shipment.trackingCode,
    };
    this.eventEmitter.emit(SHIPMENT_STATUS_CHANGED, event);
  }
}
