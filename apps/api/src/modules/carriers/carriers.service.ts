import {
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
import { decideApproval } from '../../shared/approval/decide-approval';
import {
  type PaginatedResult,
  paginate,
} from '../../shared/pagination/pagination-meta.dto';
import { PasswordService } from '../../shared/password/password.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { uniqueViolationTarget } from '../../shared/prisma/unique-violation';
import {
  average,
  countByStatus,
  createdSince,
  hoursBetween,
  percentage,
} from '../../shared/stats/stats';
import type { ModalityToggleResponseDto } from '../modalities/dto/modality-toggle-response.dto';
import { ModalitiesService } from '../modalities/modalities.service';
import type {
  CarrierPerformanceResponseDto,
  StageDurationResponseDto,
} from './dto/carrier-performance-response.dto';
import type { CarrierResponseDto } from './dto/carrier-response.dto';
import type { CoverageAreaResponseDto } from './dto/coverage-area-response.dto';
import type { CreateCarrierDto } from './dto/create-carrier.dto';
import type { OperatorRankingItemResponseDto } from './dto/operator-ranking-response.dto';
import type { CarrierStatusCountsResponseDto } from './dto/status-counts-response.dto';

const HAPPY_PATH_TRANSITIONS: [ShipmentStatus, ShipmentStatus][] = [
  [ShipmentStatus.PENDING, ShipmentStatus.ACCEPTED],
  [ShipmentStatus.ACCEPTED, ShipmentStatus.COLLECTED],
  [ShipmentStatus.COLLECTED, ShipmentStatus.IN_TRANSIT],
  [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY],
  [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED],
];

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
    private readonly modalitiesService: ModalitiesService,
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
      const target = uniqueViolationTarget(error);
      if (!target) throw error;
      // Logged only: a generic response keeps signup from enumerating registered emails/documents.
      this.logger.warn(`Carrier signup conflict on unique field: ${target}`);
      throw new ConflictException('Email or document already registered');
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

    return countByStatus(ApprovalStatus, groups);
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

    await this.modalitiesService.assertAllExist(modalityIds);

    await this.prisma.$transaction([
      this.prisma.carrierModality.deleteMany({ where: { carrierId } }),
      this.prisma.carrierModality.createMany({
        data: modalityIds.map((modalityId) => ({ carrierId, modalityId })),
      }),
    ]);

    return this.buildModalityToggles(carrierId);
  }

  async performance(
    userId: string,
    since?: Date,
  ): Promise<CarrierPerformanceResponseDto> {
    const carrierId = await this.findCarrierIdForUserOrThrow(userId);
    const where = { carrierId, ...createdSince(since) };

    const [groups, events] = await Promise.all([
      this.prisma.shipment.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.trackingEvent.findMany({
        where: { shipment: where },
        select: { shipmentId: true, status: true, createdAt: true },
        orderBy: [{ shipmentId: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    const shipmentCountsByStatus = countByStatus(ShipmentStatus, groups);
    const totalShipments = Object.values(shipmentCountsByStatus).reduce(
      (sum, count) => sum + count,
      0,
    );

    const gapsInHours: number[] = [];
    const stageGapsInHours = new Map<string, number[]>();
    for (let i = 1; i < events.length; i++) {
      if (events[i].shipmentId === events[i - 1].shipmentId) {
        const gapHours = hoursBetween(
          events[i - 1].createdAt,
          events[i].createdAt,
        );
        gapsInHours.push(gapHours);

        const stageKey = `${events[i - 1].status}_${events[i].status}`;
        const stageGaps = stageGapsInHours.get(stageKey) ?? [];
        stageGaps.push(gapHours);
        stageGapsInHours.set(stageKey, stageGaps);
      }
    }
    const avgHoursBetweenEvents = average(gapsInHours);

    const stageDurations: StageDurationResponseDto[] =
      HAPPY_PATH_TRANSITIONS.map(([fromStatus, toStatus]) => {
        const stageGaps =
          stageGapsInHours.get(`${fromStatus}_${toStatus}`) ?? [];
        return {
          fromStatus,
          toStatus,
          avgHours: average(stageGaps),
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

  async operatorRanking(
    userId: string,
    since?: Date,
  ): Promise<OperatorRankingItemResponseDto[]> {
    const carrierId = await this.findCarrierIdForUserOrThrow(userId);

    const groups = await this.prisma.shipment.groupBy({
      by: ['ownerId', 'status'],
      where: {
        carrierId,
        ownerId: { not: null },
        status: { not: ShipmentStatus.CANCELLED },
        ...createdSince(since),
      },
      _count: true,
    });

    const statsByOwnerId = new Map<
      string,
      { totalOwned: number; delivered: number }
    >();
    for (const group of groups) {
      if (!group.ownerId) continue;
      const stats = statsByOwnerId.get(group.ownerId) ?? {
        totalOwned: 0,
        delivered: 0,
      };
      stats.totalOwned += group._count;
      if (group.status === ShipmentStatus.DELIVERED) {
        stats.delivered += group._count;
      }
      statsByOwnerId.set(group.ownerId, stats);
    }
    if (statsByOwnerId.size === 0) {
      return [];
    }

    const carrierUsers = await this.prisma.carrierUser.findMany({
      where: { id: { in: [...statsByOwnerId.keys()] } },
      select: { id: true, user: { select: { email: true } } },
    });
    const emailById = new Map(
      carrierUsers.map((carrierUser) => [
        carrierUser.id,
        carrierUser.user.email,
      ]),
    );

    return [...statsByOwnerId]
      .map(([carrierUserId, stats]) => {
        const email = emailById.get(carrierUserId);
        if (!email) {
          throw new Error(`Shipment owner ${carrierUserId} has no CarrierUser`);
        }
        return { carrierUserId, email, ...stats };
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
    const enabled = await this.prisma.carrierModality.findMany({
      where: { carrierId },
      select: { modalityId: true },
    });
    return this.modalitiesService.findToggles(
      enabled.map((row) => row.modalityId),
    );
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
    const carrier = await decideApproval(
      'Carrier',
      () =>
        this.prisma.carrier.updateMany({
          where: { id, status: ApprovalStatus.PENDING },
          data: { status },
        }),
      () => this.findCarrierOrThrow(id),
    );
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
