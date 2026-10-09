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
import type {
  CarrierPerformanceResponseDto,
  StageDurationResponseDto,
} from './dto/carrier-performance-response.dto';
import type { CarrierResponseDto } from './dto/carrier-response.dto';
import type { CoverageAreaResponseDto } from './dto/coverage-area-response.dto';
import type { CreateCarrierDto } from './dto/create-carrier.dto';
import type { OperatorRankingItemResponseDto } from './dto/operator-ranking-response.dto';
import type { CarrierStatusCountsResponseDto } from './dto/status-counts-response.dto';

// Happy path only: the failure branch is a different, smaller-sample story.
const HAPPY_PATH_TRANSITIONS: [ShipmentStatus, ShipmentStatus][] = [
  [ShipmentStatus.PENDING, ShipmentStatus.ACCEPTED],
  [ShipmentStatus.ACCEPTED, ShipmentStatus.COLLECTED],
  [ShipmentStatus.COLLECTED, ShipmentStatus.IN_TRANSIT],
  [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY],
  [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED],
];

const percentage = (part: number, total: number) =>
  total > 0 ? (part / total) * 100 : 0;

const managerInclude = {
  users: {
    where: { role: CarrierRole.MANAGER },
    include: { user: { select: { email: true } } },
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

  // Consecutive-event gaps need a window function Prisma lacks, so they're computed in app code.
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
        select: { shipmentId: true, status: true, createdAt: true },
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

    // Events are ordered by (shipmentId, createdAt), so one pass yields every gap and its stage.
    const gapsInHours: number[] = [];
    const stageGapsInHours = new Map<string, number[]>();
    for (let i = 1; i < events.length; i++) {
      if (events[i].shipmentId === events[i - 1].shipmentId) {
        const gapMs =
          events[i].createdAt.getTime() - events[i - 1].createdAt.getTime();
        const gapHours = gapMs / (1000 * 60 * 60);
        gapsInHours.push(gapHours);

        const stageKey = `${events[i - 1].status}_${events[i].status}`;
        const stageGaps = stageGapsInHours.get(stageKey) ?? [];
        stageGaps.push(gapHours);
        stageGapsInHours.set(stageKey, stageGaps);
      }
    }
    const avgHoursBetweenEvents =
      gapsInHours.length > 0
        ? gapsInHours.reduce((sum, hours) => sum + hours, 0) /
          gapsInHours.length
        : null;

    const stageDurations: StageDurationResponseDto[] =
      HAPPY_PATH_TRANSITIONS.map(([fromStatus, toStatus]) => {
        const stageGaps =
          stageGapsInHours.get(`${fromStatus}_${toStatus}`) ?? [];
        return {
          fromStatus,
          toStatus,
          avgHours:
            stageGaps.length > 0
              ? stageGaps.reduce((sum, hours) => sum + hours, 0) /
                stageGaps.length
              : null,
          sampleCount: stageGaps.length,
        };
      });

    // From history, not current status: a FAILED_DELIVERY that moved on to RETURNED still failed.
    const everFailedShipmentIds = new Set(
      events
        .filter((event) => event.status === ShipmentStatus.FAILED_DELIVERY)
        .map((event) => event.shipmentId),
    );
    const failedDeliveryRate = percentage(
      everFailedShipmentIds.size,
      totalShipments,
    );
    const returnedRate = percentage(
      shipmentCountsByStatus[ShipmentStatus.RETURNED],
      totalShipments,
    );

    return {
      shipmentCountsByStatus,
      totalShipments,
      avgHoursBetweenEvents,
      failedDeliveryRate,
      returnedRate,
      stageDurations,
    };
  }

  // Two groupBys merged in app code; the result is bounded by headcount, not shipment volume.
  async operatorRanking(
    userId: string,
  ): Promise<OperatorRankingItemResponseDto[]> {
    const carrierId = await this.findCarrierIdForUserOrThrow(userId);

    const [totalGroups, deliveredGroups] = await Promise.all([
      this.prisma.shipment.groupBy({
        by: ['ownerId'],
        where: { carrierId, ownerId: { not: null } },
        _count: true,
      }),
      this.prisma.shipment.groupBy({
        by: ['ownerId'],
        where: {
          carrierId,
          ownerId: { not: null },
          status: ShipmentStatus.DELIVERED,
        },
        _count: true,
      }),
    ]);

    if (totalGroups.length === 0) {
      return [];
    }

    const deliveredByOwnerId = new Map(
      deliveredGroups.map((group) => [group.ownerId, group._count]),
    );

    const carrierUsers = await this.prisma.carrierUser.findMany({
      where: {
        id: { in: totalGroups.map((group) => group.ownerId as string) },
      },
      include: { user: { select: { email: true } } },
    });
    const carrierUserById = new Map(
      carrierUsers.map((carrierUser) => [carrierUser.id, carrierUser]),
    );

    return totalGroups
      .map((group) => {
        const ownerId = group.ownerId as string;
        const carrierUser = carrierUserById.get(ownerId);
        return {
          carrierUserId: ownerId,
          email: carrierUser?.user.email ?? 'unknown',
          totalOwned: group._count,
          delivered: deliveredByOwnerId.get(ownerId) ?? 0,
        };
      })
      .sort((a, b) => b.totalOwned - a.totalOwned);
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

    // skipDuplicates absorbs a repeated (state, city) pair in the same request.
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
    // Conditional write: of two concurrent decisions only one matches PENDING.
    const { count } = await this.prisma.carrier.updateMany({
      where: { id, status: ApprovalStatus.PENDING },
      data: { status },
    });
    const carrier = await this.findCarrierOrThrow(id);
    if (count === 0) {
      throw new ConflictException(
        `Carrier is already ${carrier.status.toLowerCase()}`,
      );
    }
    return this.toResponseDto(carrier);
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
