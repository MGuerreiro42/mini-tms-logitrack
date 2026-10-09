import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, Prisma } from '../../../generated/prisma/client';
import {
  type PaginatedResult,
  paginate,
} from '../../shared/pagination/pagination-meta.dto';
import { PasswordService } from '../../shared/password/password.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { countByStatus } from '../../shared/stats/stats';
import type { ModalityToggleResponseDto } from '../modalities/dto/modality-toggle-response.dto';
import type { CreateSellerDto } from './dto/create-seller.dto';
import type { SellerResponseDto } from './dto/seller-response.dto';
import type { SellerStatusCountsResponseDto } from './dto/status-counts-response.dto';

const withUserEmail = {
  user: { select: { email: true } },
} satisfies Prisma.SellerInclude;

type SellerWithUser = Prisma.SellerGetPayload<{
  include: typeof withUserEmail;
}>;

@Injectable()
export class SellersService {
  private readonly logger = new Logger(SellersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async signup(dto: CreateSellerDto): Promise<SellerResponseDto> {
    const passwordHash = await this.passwordService.hash(dto.password);

    try {
      const seller = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            passwordHash,
            role: 'SELLER',
          },
        });

        return tx.seller.create({
          data: {
            userId: user.id,
            companyName: dto.companyName,
            document: dto.document,
          },
        });
      });

      return {
        id: seller.id,
        email: dto.email,
        companyName: seller.companyName,
        document: seller.document,
        status: seller.status,
        createdAt: seller.createdAt,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Generic response avoids enumeration; Prisma 7 adapters report the field under driverAdapterError.
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
        this.logger.warn(`Seller signup conflict on unique field: ${target}`);
        throw new ConflictException('Email or document already registered');
      }
      throw error;
    }
  }

  async findAll(
    status?: ApprovalStatus,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<SellerResponseDto>> {
    const where = status ? { status } : undefined;
    const [sellers, total] = await Promise.all([
      this.prisma.seller.findMany({
        where,
        include: withUserEmail,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.seller.count({ where }),
    ]);

    return paginate(
      sellers.map((seller) => this.toResponseDto(seller)),
      total,
      page,
      limit,
    );
  }

  async countsByStatus(): Promise<SellerStatusCountsResponseDto> {
    const groups = await this.prisma.seller.groupBy({
      by: ['status'],
      _count: true,
    });

    return countByStatus(ApprovalStatus, groups);
  }

  async findOne(id: string): Promise<SellerResponseDto> {
    const seller = await this.findSellerOrThrow(id);
    return this.toResponseDto(seller);
  }

  async findByUserId(userId: string): Promise<SellerResponseDto> {
    const seller = await this.prisma.seller.findUnique({
      where: { userId },
      include: withUserEmail,
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    return this.toResponseDto(seller);
  }

  async approve(id: string): Promise<SellerResponseDto> {
    return this.updateStatus(id, ApprovalStatus.APPROVED);
  }

  async reject(id: string): Promise<SellerResponseDto> {
    return this.updateStatus(id, ApprovalStatus.REJECTED);
  }

  private async updateStatus(
    id: string,
    status: ApprovalStatus,
  ): Promise<SellerResponseDto> {
    // Conditional write: of two concurrent decisions only one matches PENDING.
    const { count } = await this.prisma.seller.updateMany({
      where: { id, status: ApprovalStatus.PENDING },
      data: { status },
    });
    const seller = await this.findSellerOrThrow(id);
    if (count === 0) {
      throw new ConflictException(
        `Seller is already ${seller.status.toLowerCase()}`,
      );
    }

    return this.toResponseDto(seller);
  }

  private async findSellerOrThrow(id: string): Promise<SellerWithUser> {
    const seller = await this.prisma.seller.findUnique({
      where: { id },
      include: withUserEmail,
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    return seller;
  }

  async getModalities(userId: string): Promise<ModalityToggleResponseDto[]> {
    const seller = await this.findSellerByUserIdOrThrow(userId);
    return this.buildModalityToggles(seller.id);
  }

  async setModalities(
    userId: string,
    modalityIds: string[],
  ): Promise<ModalityToggleResponseDto[]> {
    const seller = await this.findSellerByUserIdOrThrow(userId);

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
      this.prisma.sellerModality.deleteMany({
        where: { sellerId: seller.id },
      }),
      this.prisma.sellerModality.createMany({
        data: modalityIds.map((modalityId) => ({
          sellerId: seller.id,
          modalityId,
        })),
      }),
    ]);

    return this.buildModalityToggles(seller.id);
  }

  private async findSellerByUserIdOrThrow(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }
    return seller;
  }

  private async buildModalityToggles(
    sellerId: string,
  ): Promise<ModalityToggleResponseDto[]> {
    const [catalog, enabled] = await Promise.all([
      this.prisma.deliveryModality.findMany({ orderBy: { code: 'asc' } }),
      this.prisma.sellerModality.findMany({
        where: { sellerId },
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

  private toResponseDto(seller: SellerWithUser): SellerResponseDto {
    return {
      id: seller.id,
      email: seller.user.email,
      companyName: seller.companyName,
      document: seller.document,
      status: seller.status,
      createdAt: seller.createdAt,
    };
  }
}
