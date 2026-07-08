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
} from '../../../generated/prisma/client';
import { PasswordService } from '../../shared/password/password.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { CarrierResponseDto } from './dto/carrier-response.dto';
import type { CreateCarrierDto } from './dto/create-carrier.dto';

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

  async findAll(status?: ApprovalStatus): Promise<CarrierResponseDto[]> {
    const carriers = await this.prisma.carrier.findMany({
      where: status ? { status } : undefined,
      include: managerInclude,
      orderBy: { createdAt: 'desc' },
    });
    return carriers.map((carrier) => this.toResponseDto(carrier));
  }

  async findOne(id: string): Promise<CarrierResponseDto> {
    const carrier = await this.findCarrierOrThrow(id);
    return this.toResponseDto(carrier);
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
