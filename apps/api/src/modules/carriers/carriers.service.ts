import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
import { PasswordService } from '../../shared/password/password.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { ModalityToggleResponseDto } from '../modalities/dto/modality-toggle-response.dto';
import type { CarrierPerformanceResponseDto } from './dto/carrier-performance-response.dto';
import type { CarrierResponseDto } from './dto/carrier-response.dto';
import type { CoverageAreaResponseDto } from './dto/coverage-area-response.dto';
import type { CreateCarrierDto } from './dto/create-carrier.dto';
import type { CarrierStatusCountsResponseDto } from './dto/status-counts-response.dto';

const managerInclude = {
  users: {
    where: { role: CarrierRole.MANAGER },
    include: { user: true },
    take: 1,
  },
  _count: { select: { users: true } },
} satisfies Prisma.CarrierInclude;

type CarrierWithManager = Prisma.CarrierGetPayload<{
  include: typeof managerInclude;
}>;

@Injectable()
export class CarriersService {
  private readonly logger = new Logger(CarriersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async signup(dto: CreateCarrierDto): Promise<CarrierResponseDto> {
    const passwordHash = await this.passwordService.hash(dto.password);
    try {
      const carrier = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            passwordHash,
            role: 'CARRIER_MANAGER',
          },
        });
        const createdCarrier = await tx.carrier.create({
          data: { companyName: dto.companyName, document: dto.document },
        });
        await tx.carrierUser.create({
          data: {
            userId: user.id,
            carrierId: createdCarrier.id,
            role: CarrierRole.MANAGER,
          },
        });
        return createdCarrier;
      });
      return {
        id: carrier.id,
        email: dto.email,
        companyName: carrier.companyName,
        document: carrier.document,
        status: carrier.status,
        userCount: 1,
        createdAt: carrier.createdAt,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const meta = error.meta as
          | {
              target?: string[];
              driverAdapterError?: {
                cause?: { constraint?: { fields?: string[] } };
              };
            }
          | undefined;
        const target =
          meta?.target?.join(', ') ??
          meta?.driverAdapterError?.cause?.constraint?.fields?.join(', ') ??
          'unknown';
        this.logger.warn(`Carrier signup conflict on unique field: ${target}`);
        throw new ConflictException('Email or document already registered');
      }
      throw error;
    }
  }

  async findAll(
    status?: ApprovalStatus,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<CarrierResponseDto>> {
    const where = status ? { status } : undefined;
    const [carriers, total] = await Promise.all([
      this.prisma.carrier.findMany({
        where,
        include: managerInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.carrier.count({ where }),
    ]);

    return paginate(
      carriers.map((carrier) => this.toResponseDto(carrier)),
      total,
      page,
      limit,
    );
  }

  // Same reasoning as SellersService.countsByStatus — one groupBy query
  // instead of 2 separate `findAll(status, limit:1)` calls.
  async countsByStatus(): Promise<CarrierStatusCountsResponseDto> {
    const groups = await this.prisma.carrier.groupBy({
      by: ['status'],
      _count: true,
    });

    const counts: CarrierStatusCountsResponseDto = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    };
    for (const group of groups) {
      counts[group.status] = group._count;
    }
    return counts;
  }

  async findOne(id: string): Promise<CarrierResponseDto> {
    const carrier = await this.findCarrierOrThrow(id);
    return this.toResponseDto(carrier);
  }

  // Ownership-based (DESIGN.md § 16), for both MANAGER and OPERATOR — unlike
  // Seller, a Carrier isn't reached directly from userId; it goes through
  // CarrierUser first (the join row identifying which carrier this specific
  // user belongs to), then reuses findOne so the response shape stays
  // identical to the admin-facing read path.
  async findByUserId(userId: string): Promise<CarrierResponseDto> {
    const carrierId = await this.findCarrierIdForUserOrThrow(userId);
    return this.findOne(carrierId);
  }

  async getModalities(userId: string): Promise<ModalityToggleResponseDto[]> {
    const carrierId = await this.findCarrierIdForUserOrThrow(userId);
    return this.buildModalityToggles(carrierId);
  }

  async setModalities(
    userId: string,
    modalityIds: string[],
  ): Promise<ModalityToggleResponseDto[]> {
    const carrierId = await this.findCarrierIdForUserOrThrow(userId);

    if (modalityIds.length > 0) {
      const validCount = await this.prisma.deliveryModality.count({
        where: { id: { in: modalityIds } },
      });
      if (validCount !== new Set(modalityIds).size) {
        throw new BadRequestException(
          'One or more modalityIds do not exist in the DeliveryModality catalog',
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.carrierModality.deleteMany({ where: { carrierId } }),
      this.prisma.carrierModality.createMany({
        data: modalityIds.map((modalityId) => ({ carrierId, modalityId })),
      }),
    ]);

    return this.buildModalityToggles(carrierId);
  }

  // FLOW.md Frame 24's proposed contract. `shipmentCountsByStatus` reuses
  // the same groupBy technique as ShipmentsService.countsByStatusForSeller
  // and SellersService/CarriersService.countsByStatus, just scoped to this
  // carrierId instead. avgHoursBetweenEvents can't be a groupBy/aggregate —
  // it needs the gap between *consecutive* events per shipment, which
  // Prisma has no window-function equivalent for — so it's computed in
  // application code over each shipment's own ordered event list, not a
  // raw SQL window function (no $queryRaw precedent anywhere else in this
  // codebase, and this keeps the logic unit-testable against mocked rows).
  async performance(userId: string): Promise<CarrierPerformanceResponseDto> {
    const carrierId = await this.findCarrierIdForUserOrThrow(userId);

    const [groups, events] = await Promise.all([
      this.prisma.shipment.groupBy({
        by: ['status'],
        where: { carrierId },
        _count: true,
      }),
      this.prisma.trackingEvent.findMany({
        where: { shipment: { carrierId } },
        select: { shipmentId: true, createdAt: true },
        orderBy: [{ shipmentId: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    const shipmentCountsByStatus = {
      PENDING: 0,
      ACCEPTED: 0,
      COLLECTED: 0,
      IN_TRANSIT: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
      FAILED_DELIVERY: 0,
      CANCELLED: 0,
      RETURNED: 0,
    };
    for (const group of groups) {
      shipmentCountsByStatus[group.status] = group._count;
    }
    const totalShipments = Object.values(shipmentCountsByStatus).reduce(
      (sum, count) => sum + count,
      0,
    );

    // `events` is already ordered by (shipmentId, createdAt) — consecutive
    // rows for the same shipmentId are consecutive events in time, so a
    // single pass catches every gap without grouping into a Map first.
    const gapsInHours: number[] = [];
    for (let i = 1; i < events.length; i++) {
      if (events[i].shipmentId === events[i - 1].shipmentId) {
        const gapMs =
          events[i].createdAt.getTime() - events[i - 1].createdAt.getTime();
        gapsInHours.push(gapMs / (1000 * 60 * 60));
      }
    }
    const avgHoursBetweenEvents =
      gapsInHours.length > 0
        ? gapsInHours.reduce((sum, hours) => sum + hours, 0) /
          gapsInHours.length
        : null;

    const failedDeliveryRate =
      totalShipments > 0
        ? (shipmentCountsByStatus[ShipmentStatus.FAILED_DELIVERY] /
            totalShipments) *
          100
        : 0;
    const returnedRate =
      totalShipments > 0
        ? (shipmentCountsByStatus[ShipmentStatus.RETURNED] / totalShipments) *
          100
        : 0;

    return {
      shipmentCountsByStatus,
      totalShipments,
      avgHoursBetweenEvents,
      failedDeliveryRate,
      returnedRate,
    };
  }

  async getCoverageAreas(userId: string): Promise<CoverageAreaResponseDto[]> {
    const carrierId = await this.findCarrierIdForUserOrThrow(userId);
    return this.listCoverageAreas(carrierId);
  }

  async setCoverageAreas(
    userId: string,
    areas: { state: string; city?: string }[],
  ): Promise<CoverageAreaResponseDto[]> {
    const carrierId = await this.findCarrierIdForUserOrThrow(userId);

    // Full-replace, same pattern as modalities — the client always submits
    // the complete desired coverage list, not incremental add/remove calls.
    // `skipDuplicates` guards against the client submitting the same
    // (state, city) pair twice in one request, which would otherwise violate
    // @@unique([carrierId, state, city]) on the second insert.
    await this.prisma.$transaction([
      this.prisma.carrierCoverageArea.deleteMany({ where: { carrierId } }),
      this.prisma.carrierCoverageArea.createMany({
        data: areas.map((area) => ({
          carrierId,
          state: area.state,
          city: area.city ?? null,
        })),
        skipDuplicates: true,
      }),
    ]);

    return this.listCoverageAreas(carrierId);
  }

  private async listCoverageAreas(
    carrierId: string,
  ): Promise<CoverageAreaResponseDto[]> {
    const areas = await this.prisma.carrierCoverageArea.findMany({
      where: { carrierId },
      orderBy: [{ state: 'asc' }, { city: 'asc' }],
    });
    return areas.map((area) => ({
      id: area.id,
      state: area.state,
      city: area.city,
    }));
  }

  private async buildModalityToggles(
    carrierId: string,
  ): Promise<ModalityToggleResponseDto[]> {
    const [catalog, enabled] = await Promise.all([
      this.prisma.deliveryModality.findMany({ orderBy: { code: 'asc' } }),
      this.prisma.carrierModality.findMany({
        where: { carrierId },
        select: { modalityId: true },
      }),
    ]);

    const enabledIds = new Set(enabled.map((row) => row.modalityId));
    return catalog.map((modality) => ({
      id: modality.id,
      code: modality.code,
      name: modality.name,
      enabled: enabledIds.has(modality.id),
    }));
  }

  private async findCarrierIdForUserOrThrow(userId: string): Promise<string> {
    const carrierUser = await this.prisma.carrierUser.findUnique({
      where: { userId },
    });
    if (!carrierUser) {
      throw new NotFoundException('Carrier not found');
    }
    return carrierUser.carrierId;
  }

  async approve(id: string): Promise<CarrierResponseDto> {
    return this.updateStatus(id, ApprovalStatus.APPROVED);
  }

  async reject(id: string): Promise<CarrierResponseDto> {
    return this.updateStatus(id, ApprovalStatus.REJECTED);
  }

  private async updateStatus(
    id: string,
    status: ApprovalStatus,
  ): Promise<CarrierResponseDto> {
    const carrier = await this.findCarrierOrThrow(id);
    if (carrier.status !== ApprovalStatus.PENDING) {
      throw new ConflictException(
        `Carrier is already ${carrier.status.toLowerCase()}`,
      );
    }
    const updated = await this.prisma.carrier.update({
      where: { id },
      data: { status },
      include: managerInclude,
    });
    return this.toResponseDto(updated);
  }

  private async findCarrierOrThrow(id: string): Promise<CarrierWithManager> {
    const carrier = await this.prisma.carrier.findUnique({
      where: { id },
      include: managerInclude,
    });
    if (!carrier) throw new NotFoundException('Carrier not found');
    return carrier;
  }

  private toResponseDto(carrier: CarrierWithManager): CarrierResponseDto {
    return {
      id: carrier.id,
      email: carrier.users[0].user.email,
      companyName: carrier.companyName,
      document: carrier.document,
      status: carrier.status,
      userCount: carrier._count.users,
      createdAt: carrier.createdAt,
    };
  }
}
