import { randomBytes } from 'node:crypto';
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
  Prisma,
  ShipmentStatus,
} from '../../../generated/prisma/client';
import {
  type PaginatedResult,
  paginate,
} from '../../shared/pagination/pagination-meta.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type {
  CarrierShipmentDetailResponseDto,
  CarrierShipmentResponseDto,
} from './dto/carrier-shipment-response.dto';
import type { CreateShipmentDto } from './dto/create-shipment.dto';
import type { EligibleCarrierResponseDto } from './dto/eligible-carrier-response.dto';
import type { PublicTrackingResponseDto } from './dto/public-tracking-response.dto';
import type { ShipmentResponseDto } from './dto/shipment-response.dto';
import type { TrackingEventDto } from './dto/tracking-event.dto';
import type { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { SHIPMENT_STATUS_CHANGED } from './shipment-events';
import { isValidTransition } from './shipment-status.util';

const withCarrierAndModality = {
  carrier: { select: { companyName: true } },
  modality: { select: { name: true } },
} satisfies Prisma.ShipmentInclude;

const withCarrierModalityAndEvents = {
  ...withCarrierAndModality,
  trackingEvents: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ShipmentInclude;

type ShipmentWithRelations = Prisma.ShipmentGetPayload<{
  include: typeof withCarrierAndModality;
}>;

// Carrier-facing reads need the seller's contact info and the claiming
// CarrierUser — neither of which the seller-facing includes above carry.
const carrierQueueInclude = {
  modality: { select: { name: true } },
  seller: { include: { user: { select: { email: true } } } },
  owner: { include: { user: { select: { email: true } } } },
} satisfies Prisma.ShipmentInclude;

const carrierDetailInclude = {
  ...carrierQueueInclude,
  trackingEvents: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ShipmentInclude;

type ShipmentForCarrier = Prisma.ShipmentGetPayload<{
  include: typeof carrierQueueInclude;
}>;

type ShipmentForCarrierDetail = Prisma.ShipmentGetPayload<{
  include: typeof carrierDetailInclude;
}>;

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
            // Plain equality — `state` is normalized to uppercase at every
            // DTO entry point (CoverageAreaInputDto, CreateShipmentDto,
            // EligibleCarriersQueryDto), so this stays a sargable, indexable
            // comparison (see DESIGN.md § 19's addendum on this). `city`
            // stays case-insensitive on purpose: it has real display casing
            // worth preserving ("São Paulo"), unlike a UF code, so it isn't
            // normalized at write — confirmed real bug otherwise (a carrier
            // registering "Araraquara" and a seller typing "ARARAQUARA"
            // must still match).
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

  // No user context at all — reachable by anyone holding the trackingCode.
  // `trackingCode` is `@unique` in the schema, so `findUnique` is the exact
  // right lookup (same reasoning as auth's email lookup), returning the same
  // 404 whether the code never existed or was mistyped — nothing here
  // distinguishes those two cases, on purpose.
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
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }
    if (seller.status !== ApprovalStatus.APPROVED) {
      throw new BadRequestException(
        'Only an approved seller can create shipments',
      );
    }

    // Re-validated here even though the frontend is expected to only ever
    // offer choices from GET /sellers/me/modalities and
    // GET /shipments/eligible-carriers — those are two independent calls
    // with nothing enforcing the client actually used their result, so every
    // constraint they represent is checked again against this exact request.
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
              // Same rule as findEligibleCarriers — plain equality for
              // state (normalized at the DTO boundary), case-insensitive
              // for city (display casing preserved on purpose).
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
        trackingCode: this.generateTrackingCode(),
        sellerId: seller.id,
        carrierId: dto.carrierId,
        modalityId: dto.modalityId,
        addressStreet: dto.addressStreet,
        addressNumber: dto.addressNumber,
        addressComplement: dto.addressComplement,
        addressNeighborhood: dto.addressNeighborhood,
        addressCity: dto.addressCity,
        addressState: dto.addressState,
        addressZipCode: dto.addressZipCode,
      },
      include: withCarrierAndModality,
    });

    return this.toResponseDto(shipment);
  }

  async findAllForSeller(
    userId: string,
    status?: ShipmentStatus,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<ShipmentResponseDto>> {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const where = { sellerId: seller.id, ...(status ? { status } : {}) };
    const [shipments, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        include: withCarrierAndModality,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return paginate(
      shipments.map((shipment) => this.toResponseDto(shipment)),
      total,
      page,
      limit,
    );
  }

  async findOneForSeller(
    userId: string,
    id: string,
  ): Promise<ShipmentResponseDto> {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    // Scoped to sellerId in the query itself, not checked after the fact —
    // a shipment belonging to another seller returns the same 404 as one
    // that doesn't exist at all, rather than confirming its existence via a
    // 403 (same enumeration-avoidance principle as the signup conflict fix).
    // Includes the full TrackingEvent timeline — unlike the paginated list,
    // a single-record read can afford it (DESIGN.md § 18's over-fetch
    // reasoning), and it's exactly the "seller following the shipment" read
    // the real-time flow (DESIGN.md § 5) is meant to keep current.
    const shipment = await this.prisma.shipment.findFirst({
      where: { id, sellerId: seller.id },
      include: withCarrierModalityAndEvents,
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return {
      ...this.toResponseDto(shipment),
      trackingEvents: shipment.trackingEvents.map((event) =>
        this.toTrackingEventDto(event),
      ),
    };
  }

  // Distinct from (and deliberately not shared with) CarriersService's
  // private findCarrierIdForUserOrThrow: that one returns just a carrierId,
  // enough for its own callers. claim()/updateStatus() need the full row
  // (id, carrierId, role) to check ownership and the manager-bypass rule —
  // a genuinely different shape, not just a different caller of the same
  // lookup, so duplicating the ~6 lines here beats inventing a shared
  // cross-module helper for a single two-caller, differently-shaped need.
  private async findCarrierUserOrThrow(userId: string) {
    const carrierUser = await this.prisma.carrierUser.findUnique({
      where: { userId },
    });
    if (!carrierUser) {
      throw new NotFoundException('Carrier not found');
    }
    return carrierUser;
  }

  // Shared by claim() and updateStatus() — both need the same "does this
  // shipment exist in *this* carrier" scoped lookup (404, not 403, for a
  // shipment belonging to another carrier) before doing their own
  // additional checks.
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
        include: carrierQueueInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return paginate(
      shipments.map((shipment) => this.toCarrierResponseDto(shipment)),
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

    // Same 404-not-403 ownership-scoping idiom as findOneForSeller — a
    // shipment belonging to another carrier looks identical to one that
    // doesn't exist.
    const shipment = await this.prisma.shipment.findFirst({
      where: { id, carrierId: carrierUser.carrierId },
      include: carrierDetailInclude,
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return this.toCarrierDetailResponseDto(shipment);
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
    // Re-approving an already-decided seller/carrier is a 409, not a silent
    // no-op (DESIGN.md § 16.1) — same principle here: claiming an
    // already-owned shipment should say something didn't change, not pretend
    // to succeed a second time. This is only a fast, friendly pre-check —
    // the real guard is the updateMany's WHERE below.
    if (shipment.ownerId) {
      throw new ConflictException('Shipment has already been claimed');
    }

    // The read above can't be trusted alone — two operators can both read
    // ownerId: null before either writes. Putting the same "still unowned"
    // precondition in the UPDATE's own WHERE clause makes Postgres (not
    // this process) decide who wins: only the request whose WHERE still
    // matches at write time affects a row. `count === 0` means someone else
    // won the race between the read above and this write — surfaced as the
    // same 409 a second claim attempt gets, not two operators both getting
    // a 200 for the same shipment.
    const claimed = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.shipment.updateMany({
        where: { id: shipmentId, ownerId: null },
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
      throw new ConflictException('Shipment has already been claimed');
    }

    const updated = await this.prisma.shipment.findUniqueOrThrow({
      where: { id: shipmentId },
      include: carrierQueueInclude,
    });

    this.eventEmitter.emit(SHIPMENT_STATUS_CHANGED, {
      shipmentId,
      carrierId: carrierUser.carrierId,
      sellerId: updated.sellerId,
      status: ShipmentStatus.ACCEPTED,
      trackingCode: updated.trackingCode,
    });

    return this.toCarrierResponseDto(updated);
  }

  async updateStatus(
    userId: string,
    shipmentId: string,
    dto: UpdateShipmentStatusDto,
  ): Promise<CarrierShipmentResponseDto> {
    const carrierUser = await this.findCarrierUserOrThrow(userId);
    const shipment = await this.findCarrierShipmentOrThrow(
      carrierUser.carrierId,
      shipmentId,
    );

    // A PENDING shipment has no owner yet — the only way to move it forward
    // is /claim, which sets ownerId in the same write. isValidTransition
    // alone would let PENDING -> ACCEPTED through (it's structurally listed
    // as valid, for the frontend's UI mirror and for exhaustively testing
    // the map itself) — but a manager bypasses the ownership check below, so
    // without this explicit guard a manager could flip status to ACCEPTED
    // on a still-unowned shipment, corrupting the "ACCEPTED implies owned"
    // invariant the rest of the queue relies on.
    if (shipment.status === ShipmentStatus.PENDING) {
      throw new BadRequestException(
        'Pending shipments must be claimed via PATCH /shipments/:id/claim, not updated directly',
      );
    }

    // The owner can always act on their own shipment; a manager can act on
    // any shipment in their own carrier to unblock operations (DESIGN.md
    // § 3) — a non-owning operator cannot. Deliberately different from the
    // manager-only-mutation rule used for CarrierModality/CoverageArea:
    // those are company-wide config, this is a per-shipment operational
    // action any claiming operator should be able to drive themselves.
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

    // Same TOCTOU concern as claim(): the checks above ran against a read
    // taken before this write. Two concurrent requests advancing the same
    // shipment (e.g. the owner and the manager both submitting "Advance to
    // COLLECTED" moments apart) would otherwise both pass validation and
    // both write, leaving two TrackingEvent rows for one logical
    // transition. Guarding the update's WHERE on the exact status this
    // request validated against makes the write atomic: only the request
    // whose expected `status` still matches at write time succeeds.
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
      include: carrierQueueInclude,
    });

    this.eventEmitter.emit(SHIPMENT_STATUS_CHANGED, {
      shipmentId,
      carrierId: carrierUser.carrierId,
      sellerId: updated.sellerId,
      status: dto.status,
      trackingCode: updated.trackingCode,
    });

    return this.toCarrierResponseDto(updated);
  }

  private generateTrackingCode(): string {
    return `TMS-${randomBytes(6).toString('hex').toUpperCase()}`;
  }

  private toResponseDto(shipment: ShipmentWithRelations): ShipmentResponseDto {
    return {
      id: shipment.id,
      trackingCode: shipment.trackingCode,
      status: shipment.status,
      carrierId: shipment.carrierId,
      carrierName: shipment.carrier.companyName,
      modalityId: shipment.modalityId,
      modalityName: shipment.modality.name,
      addressStreet: shipment.addressStreet,
      addressNumber: shipment.addressNumber,
      addressComplement: shipment.addressComplement,
      addressNeighborhood: shipment.addressNeighborhood,
      addressCity: shipment.addressCity,
      addressState: shipment.addressState,
      addressZipCode: shipment.addressZipCode,
      createdAt: shipment.createdAt,
    };
  }

  private toCarrierResponseDto(
    shipment: ShipmentForCarrier,
  ): CarrierShipmentResponseDto {
    return {
      id: shipment.id,
      trackingCode: shipment.trackingCode,
      status: shipment.status,
      modalityId: shipment.modalityId,
      modalityName: shipment.modality.name,
      sellerId: shipment.sellerId,
      sellerCompanyName: shipment.seller.companyName,
      sellerEmail: shipment.seller.user.email,
      ownerId: shipment.ownerId,
      ownerEmail: shipment.owner?.user.email ?? null,
      addressStreet: shipment.addressStreet,
      addressNumber: shipment.addressNumber,
      addressComplement: shipment.addressComplement,
      addressNeighborhood: shipment.addressNeighborhood,
      addressCity: shipment.addressCity,
      addressState: shipment.addressState,
      addressZipCode: shipment.addressZipCode,
      createdAt: shipment.createdAt,
    };
  }

  private toCarrierDetailResponseDto(
    shipment: ShipmentForCarrierDetail,
  ): CarrierShipmentDetailResponseDto {
    return {
      ...this.toCarrierResponseDto(shipment),
      trackingEvents: shipment.trackingEvents.map((event) =>
        this.toTrackingEventDto(event),
      ),
    };
  }

  private toTrackingEventDto(event: {
    id: string;
    status: ShipmentStatus;
    note: string | null;
    createdAt: Date;
  }): TrackingEventDto {
    return {
      id: event.id,
      status: event.status,
      note: event.note,
      createdAt: event.createdAt,
    };
  }
}
