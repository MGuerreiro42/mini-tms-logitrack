import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalStatus,
  Prisma,
  type ShipmentStatus,
} from '../../../generated/prisma/client';
import {
  type PaginatedResult,
  paginate,
} from '../../shared/pagination/pagination-meta.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { CreateShipmentDto } from './dto/create-shipment.dto';
import type { EligibleCarrierResponseDto } from './dto/eligible-carrier-response.dto';
import type { ShipmentResponseDto } from './dto/shipment-response.dto';

const withCarrierAndModality = {
  carrier: { select: { companyName: true } },
  modality: { select: { name: true } },
} satisfies Prisma.ShipmentInclude;

type ShipmentWithRelations = Prisma.ShipmentGetPayload<{
  include: typeof withCarrierAndModality;
}>;

@Injectable()
export class ShipmentsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const shipment = await this.prisma.shipment.findFirst({
      where: { id, sellerId: seller.id },
      include: withCarrierAndModality,
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return this.toResponseDto(shipment);
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
}
