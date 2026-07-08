import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, Prisma } from '../../../generated/prisma/client';
import { PasswordService } from '../../shared/password/password.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { CreateSellerDto } from './dto/create-seller.dto';
import type { SellerResponseDto } from './dto/seller-response.dto';

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

  async findAll(status?: ApprovalStatus): Promise<SellerResponseDto[]> {
    const sellers = await this.prisma.seller.findMany({
      where: status ? { status } : undefined,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    return sellers.map((seller) => this.toResponseDto(seller));
  }

  async findOne(id: string): Promise<SellerResponseDto> {
    const seller = await this.findSellerOrThrow(id);
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
