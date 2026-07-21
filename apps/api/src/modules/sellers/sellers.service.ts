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
import type { ModalityToggleResponseDto } from '../modalities/dto/modality-toggle-response.dto';
import type { CreateSellerDto } from './dto/create-seller.dto';
import type { SellerResponseDto } from './dto/seller-response.dto';
import type { SellerStatusCountsResponseDto } from './dto/status-counts-response.dto';

type SellerWithUser = Prisma.SellerGetPayload<{ include: { user: true } }>;

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
        // Logged server-side only — the client response stays generic on
        // purpose, so a public signup form can't be used to enumerate which
        // specific email/document is already registered. Prisma 7's driver
        // adapters report the colliding field(s) under
        // meta.driverAdapterError.cause.constraint.fields, not meta.target
        // (the field used by older Prisma versions / non-adapter engines).
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
    // Independent reads — run in parallel instead of awaiting sequentially.
    const [sellers, total] = await Promise.all([
      this.prisma.seller.findMany({
        where,
        include: { user: true },
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

  // One query, not the 2 separate `findAll(status, limit:1)` calls the admin
  // dashboard used before — those each ran a full joined `findMany` server
  // side just to read `meta.total` off it (see DESIGN.md's dashboard slice).
  async countsByStatus(): Promise<SellerStatusCountsResponseDto> {
    const groups = await this.prisma.seller.groupBy({
      by: ['status'],
      _count: true,
    });

    const counts: SellerStatusCountsResponseDto = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    };
    for (const group of groups) {
      counts[group.status] = group._count;
    }
    return counts;
  }

  async findOne(id: string): Promise<SellerResponseDto> {
    const seller = await this.findSellerOrThrow(id);
    return this.toResponseDto(seller);
  }

  // Ownership-based, not role-based (DESIGN.md § 16) — looked up by the
  // authenticated User's own id, not an :id param, so there's no way for
  // one seller to read another's record through this route.
  async findByUserId(userId: string): Promise<SellerResponseDto> {
    const seller = await this.prisma.seller.findUnique({
      where: { userId },
      include: { user: true },
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
    const seller = await this.findSellerOrThrow(id);

    if (seller.status !== ApprovalStatus.PENDING) {
      throw new ConflictException(
        `Seller is already ${seller.status.toLowerCase()}`,
      );
    }

    const updated = await this.prisma.seller.update({
      where: { id },
      data: { status },
      include: { user: true },
    });

    return this.toResponseDto(updated);
  }

  private async findSellerOrThrow(id: string): Promise<SellerWithUser> {
    const seller = await this.prisma.seller.findUnique({
      where: { id },
      include: { user: true },
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

    // Full-replace semantics — the client always sends the complete desired
    // set (matches a checkbox-list UI), not an incremental enable/disable
    // call, so there's no risk of server and client state drifting apart.
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
