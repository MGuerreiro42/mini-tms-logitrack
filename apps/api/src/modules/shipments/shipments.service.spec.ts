import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { CreateShipmentDto } from './dto/create-shipment.dto';
import { ShipmentsService } from './shipments.service';

describe('ShipmentsService', () => {
  let shipmentsService: ShipmentsService;
  const sellerFindUnique = vi.fn();
  const sellerModalityFindUnique = vi.fn();
  const carrierFindFirst = vi.fn();
  const carrierFindMany = vi.fn();
  const shipmentCreate = vi.fn();
  const shipmentFindMany = vi.fn();
  const shipmentFindFirst = vi.fn();
  const shipmentCount = vi.fn();

  const dto: CreateShipmentDto = {
    addressStreet: 'Av. Paulista',
    addressNumber: '1000',
    addressNeighborhood: 'Bela Vista',
    addressCity: 'São Paulo',
    addressState: 'SP',
    addressZipCode: '01310-100',
    modalityId: 'modality-1',
    carrierId: 'carrier-1',
  };

  const approvedSeller = { id: 'seller-1', status: 'APPROVED' };

  const shipmentWithRelations = {
    id: 'shipment-1',
    trackingCode: 'TMS-ABC123',
    status: 'PENDING',
    carrierId: 'carrier-1',
    carrier: { companyName: 'Fast Freight' },
    modalityId: 'modality-1',
    modality: { name: 'Standard' },
    addressStreet: 'Av. Paulista',
    addressNumber: '1000',
    addressComplement: null,
    addressNeighborhood: 'Bela Vista',
    addressCity: 'São Paulo',
    addressState: 'SP',
    addressZipCode: '01310-100',
    createdAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    sellerFindUnique.mockReset();
    sellerModalityFindUnique.mockReset();
    carrierFindFirst.mockReset();
    carrierFindMany.mockReset();
    shipmentCreate.mockReset();
    shipmentFindMany.mockReset();
    shipmentFindFirst.mockReset();
    shipmentCount.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipmentsService,
        {
          provide: PrismaService,
          useValue: {
            seller: { findUnique: sellerFindUnique },
            sellerModality: { findUnique: sellerModalityFindUnique },
            carrier: { findFirst: carrierFindFirst, findMany: carrierFindMany },
            shipment: {
              create: shipmentCreate,
              findMany: shipmentFindMany,
              findFirst: shipmentFindFirst,
              count: shipmentCount,
            },
          },
        },
      ],
    }).compile();

    shipmentsService = module.get(ShipmentsService);
  });

  describe('findEligibleCarriers', () => {
    it('queries approved carriers matching coverage and modality', async () => {
      carrierFindMany.mockResolvedValue([
        { id: 'carrier-1', companyName: 'Fast Freight' },
      ]);

      const result = await shipmentsService.findEligibleCarriers(
        'SP',
        'São Paulo',
        'modality-1',
      );

      expect(carrierFindMany).toHaveBeenCalledWith({
        where: {
          status: 'APPROVED',
          coverageAreas: {
            some: {
              state: 'SP',
              OR: [
                { city: null },
                { city: { equals: 'São Paulo', mode: 'insensitive' } },
              ],
            },
          },
          modalities: { some: { modalityId: 'modality-1' } },
        },
        select: { id: true, companyName: true },
        orderBy: { companyName: 'asc' },
      });
      expect(result).toEqual([
        { id: 'carrier-1', companyName: 'Fast Freight' },
      ]);
    });
  });

  describe('create', () => {
    it('creates a shipment when seller is approved, modality enabled, and carrier matches', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      sellerModalityFindUnique.mockResolvedValue({
        sellerId: 'seller-1',
        modalityId: 'modality-1',
      });
      carrierFindFirst.mockResolvedValue({ id: 'carrier-1' });
      shipmentCreate.mockResolvedValue(shipmentWithRelations);

      const result = await shipmentsService.create('user-1', dto);

      expect(shipmentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sellerId: 'seller-1',
            carrierId: 'carrier-1',
            modalityId: 'modality-1',
            trackingCode: expect.stringMatching(/^TMS-[0-9A-F]{12}$/),
          }),
        }),
      );
      expect(result.trackingCode).toBe('TMS-ABC123');
      expect(result.carrierName).toBe('Fast Freight');
    });

    it('throws NotFoundException when the user has no Seller profile', async () => {
      sellerFindUnique.mockResolvedValue(null);

      await expect(shipmentsService.create('user-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when the seller is not approved', async () => {
      sellerFindUnique.mockResolvedValue({ id: 'seller-1', status: 'PENDING' });

      await expect(shipmentsService.create('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when the modality is not enabled for the seller', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      sellerModalityFindUnique.mockResolvedValue(null);
      carrierFindFirst.mockResolvedValue({ id: 'carrier-1' });

      await expect(shipmentsService.create('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(shipmentCreate).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when no carrier matches coverage+modality+approval', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      sellerModalityFindUnique.mockResolvedValue({
        sellerId: 'seller-1',
        modalityId: 'modality-1',
      });
      carrierFindFirst.mockResolvedValue(null);

      await expect(shipmentsService.create('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(shipmentCreate).not.toHaveBeenCalled();
    });
  });

  describe('findAllForSeller', () => {
    it('scopes the list to the seller resolved from userId', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      shipmentFindMany.mockResolvedValue([shipmentWithRelations]);
      shipmentCount.mockResolvedValue(1);

      const result = await shipmentsService.findAllForSeller('user-1');

      expect(shipmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { sellerId: 'seller-1' } }),
      );
      expect(result.meta.total).toBe(1);
      expect(result.data[0].id).toBe('shipment-1');
    });
  });

  describe('findOneForSeller', () => {
    it('returns the shipment when owned by the seller', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      shipmentFindFirst.mockResolvedValue(shipmentWithRelations);

      const result = await shipmentsService.findOneForSeller(
        'user-1',
        'shipment-1',
      );

      expect(shipmentFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shipment-1', sellerId: 'seller-1' },
        }),
      );
      expect(result.id).toBe('shipment-1');
    });

    it('throws NotFoundException when the shipment belongs to another seller (same as not existing)', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      shipmentFindFirst.mockResolvedValue(null);

      await expect(
        shipmentsService.findOneForSeller('user-1', 'someone-elses-shipment'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
