import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { CreateShipmentDto } from './dto/create-shipment.dto';
import type { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { ShipmentsService } from './shipments.service';

describe('ShipmentsService', () => {
  let shipmentsService: ShipmentsService;
  const sellerFindUnique = vi.fn();
  const sellerModalityFindUnique = vi.fn();
  const carrierFindFirst = vi.fn();
  const carrierFindMany = vi.fn();
  const carrierUserFindUnique = vi.fn();
  const shipmentCreate = vi.fn();
  const shipmentFindMany = vi.fn();
  const shipmentFindFirst = vi.fn();
  const shipmentCount = vi.fn();
  const shipmentUpdateMany = vi.fn();
  const shipmentFindUniqueOrThrow = vi.fn();
  const trackingEventCreate = vi.fn();
  const transaction = vi.fn();
  const emit = vi.fn();

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
    trackingEvents: [],
  };

  const carrierManager = {
    id: 'carrier-user-manager',
    userId: 'user-manager',
    carrierId: 'carrier-1',
    role: 'MANAGER',
  };

  const carrierOperator = {
    id: 'carrier-user-operator',
    userId: 'user-operator',
    carrierId: 'carrier-1',
    role: 'OPERATOR',
  };

  const carrierShipment = {
    id: 'shipment-1',
    trackingCode: 'TMS-ABC123',
    status: 'ACCEPTED',
    carrierId: 'carrier-1',
    sellerId: 'seller-1',
    seller: {
      companyName: 'Acme Store',
      user: { email: 'seller@example.com' },
    },
    ownerId: 'carrier-user-operator',
    owner: { user: { email: 'operator@example.com' } },
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
    trackingEvents: [],
  };

  beforeEach(async () => {
    sellerFindUnique.mockReset();
    sellerModalityFindUnique.mockReset();
    carrierFindFirst.mockReset();
    carrierFindMany.mockReset();
    carrierUserFindUnique.mockReset();
    shipmentCreate.mockReset();
    shipmentFindMany.mockReset();
    shipmentFindFirst.mockReset();
    shipmentCount.mockReset();
    shipmentUpdateMany.mockReset();
    shipmentFindUniqueOrThrow.mockReset();
    trackingEventCreate.mockReset();
    transaction.mockReset();
    emit.mockReset();

    // Default transaction mock supports both the array form ($transaction([
    // update, create])) used by earlier writes and the callback form
    // (claim()/updateStatus()'s atomic updateMany-then-create) — the
    // callback receives a `tx` exposing the same mocked shipment/
    // trackingEvent methods as the top-level PrismaService, so assertions
    // work the same regardless of which form a given write uses.
    const tx = {
      shipment: { updateMany: shipmentUpdateMany },
      trackingEvent: { create: trackingEventCreate },
    };
    transaction.mockImplementation(
      async (arg: unknown[] | ((tx: unknown) => Promise<unknown>)) =>
        typeof arg === 'function' ? arg(tx) : Promise.all(arg),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipmentsService,
        {
          provide: PrismaService,
          useValue: {
            seller: { findUnique: sellerFindUnique },
            sellerModality: { findUnique: sellerModalityFindUnique },
            carrier: { findFirst: carrierFindFirst, findMany: carrierFindMany },
            carrierUser: { findUnique: carrierUserFindUnique },
            shipment: {
              create: shipmentCreate,
              findMany: shipmentFindMany,
              findFirst: shipmentFindFirst,
              findUniqueOrThrow: shipmentFindUniqueOrThrow,
              count: shipmentCount,
              updateMany: shipmentUpdateMany,
            },
            trackingEvent: { create: trackingEventCreate },
            $transaction: transaction,
          },
        },
        { provide: EventEmitter2, useValue: { emit } },
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
      expect(result.trackingEvents).toEqual([]);
    });

    it('throws NotFoundException when the shipment belongs to another seller (same as not existing)', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      shipmentFindFirst.mockResolvedValue(null);

      await expect(
        shipmentsService.findOneForSeller('user-1', 'someone-elses-shipment'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllForCarrier', () => {
    it('scopes the list to the carrier resolved from userId', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindMany.mockResolvedValue([carrierShipment]);
      shipmentCount.mockResolvedValue(1);

      const result = await shipmentsService.findAllForCarrier('user-operator');

      expect(shipmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { carrierId: 'carrier-1' } }),
      );
      expect(result.data[0].sellerCompanyName).toBe('Acme Store');
      expect(result.data[0].ownerEmail).toBe('operator@example.com');
    });

    it('throws NotFoundException when the user has no CarrierUser profile', async () => {
      carrierUserFindUnique.mockResolvedValue(null);

      await expect(
        shipmentsService.findAllForCarrier('stranger'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneForCarrier', () => {
    it('returns the shipment with its tracking timeline when owned by the carrier', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(carrierShipment);

      const result = await shipmentsService.findOneForCarrier(
        'user-operator',
        'shipment-1',
      );

      expect(shipmentFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shipment-1', carrierId: 'carrier-1' },
        }),
      );
      expect(result.trackingEvents).toEqual([]);
    });

    it('throws NotFoundException when the shipment belongs to another carrier (same as not existing)', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(null);

      await expect(
        shipmentsService.findOneForCarrier(
          'user-operator',
          'other-carriers-shipment',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('claim', () => {
    const pendingShipment = {
      ...carrierShipment,
      status: 'PENDING',
      ownerId: null,
      owner: null,
    };

    it('claims an unowned shipment: sets ownerId, moves to ACCEPTED, writes a TrackingEvent, emits', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(pendingShipment);
      shipmentUpdateMany.mockResolvedValue({ count: 1 });
      shipmentFindUniqueOrThrow.mockResolvedValue(carrierShipment);

      const result = await shipmentsService.claim(
        'user-operator',
        'shipment-1',
      );

      expect(shipmentUpdateMany).toHaveBeenCalledWith({
        where: { id: 'shipment-1', ownerId: null },
        data: { ownerId: 'carrier-user-operator', status: 'ACCEPTED' },
      });
      expect(trackingEventCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { shipmentId: 'shipment-1', status: 'ACCEPTED' },
        }),
      );
      expect(emit).toHaveBeenCalledWith(
        'shipment.status-changed',
        expect.objectContaining({
          shipmentId: 'shipment-1',
          status: 'ACCEPTED',
        }),
      );
      expect(result.id).toBe('shipment-1');
    });

    it('throws NotFoundException for a shipment belonging to another carrier', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(null);

      await expect(
        shipmentsService.claim('user-operator', 'other-carriers-shipment'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the pre-check already sees an owner', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierManager);
      shipmentFindFirst.mockResolvedValue(carrierShipment);

      await expect(
        shipmentsService.claim('user-manager', 'shipment-1'),
      ).rejects.toThrow(ConflictException);
      expect(shipmentUpdateMany).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a concurrent claim wins the race (updateMany affects 0 rows)', async () => {
      // Regression test: the pre-check alone can't be trusted — two
      // operators can both read ownerId: null before either writes. This
      // simulates that: the read-based pre-check sees the shipment as
      // still unowned, but the atomic updateMany (racing against another
      // request) affects 0 rows because someone else's write already went
      // through first.
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(pendingShipment);
      shipmentUpdateMany.mockResolvedValue({ count: 0 });

      await expect(
        shipmentsService.claim('user-operator', 'shipment-1'),
      ).rejects.toThrow(ConflictException);
      expect(trackingEventCreate).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    const dto: UpdateShipmentStatusDto = { status: 'COLLECTED' };

    it('allows the owning operator to advance a valid transition', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(carrierShipment); // status ACCEPTED, owned by operator
      shipmentUpdateMany.mockResolvedValue({ count: 1 });
      shipmentFindUniqueOrThrow.mockResolvedValue({
        ...carrierShipment,
        status: 'COLLECTED',
      });

      const result = await shipmentsService.updateStatus(
        'user-operator',
        'shipment-1',
        dto,
      );

      expect(shipmentUpdateMany).toHaveBeenCalledWith({
        where: { id: 'shipment-1', status: 'ACCEPTED' },
        data: { status: 'COLLECTED' },
      });
      expect(emit).toHaveBeenCalled();
      expect(result.status).toBe('COLLECTED');
    });

    it('allows the manager to advance a shipment they do not own', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierManager);
      shipmentFindFirst.mockResolvedValue(carrierShipment); // owned by the operator, not the manager
      shipmentUpdateMany.mockResolvedValue({ count: 1 });
      shipmentFindUniqueOrThrow.mockResolvedValue({
        ...carrierShipment,
        status: 'COLLECTED',
      });

      await shipmentsService.updateStatus('user-manager', 'shipment-1', dto);

      expect(shipmentUpdateMany).toHaveBeenCalled();
    });

    it('throws ForbiddenException for a non-owning operator', async () => {
      const otherOperator = { ...carrierOperator, id: 'someone-else' };
      carrierUserFindUnique.mockResolvedValue(otherOperator);
      shipmentFindFirst.mockResolvedValue(carrierShipment); // owned by 'carrier-user-operator'

      await expect(
        shipmentsService.updateStatus('user-other', 'shipment-1', dto),
      ).rejects.toThrow(ForbiddenException);
      expect(shipmentUpdateMany).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for an invalid transition', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(carrierShipment); // status ACCEPTED
      const skipAheadDto: UpdateShipmentStatusDto = { status: 'DELIVERED' };

      await expect(
        shipmentsService.updateStatus(
          'user-operator',
          'shipment-1',
          skipAheadDto,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(shipmentUpdateMany).not.toHaveBeenCalled();
    });

    it('rejects updating a PENDING/unowned shipment directly, even for a manager (the bypass regression)', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierManager);
      shipmentFindFirst.mockResolvedValue({
        ...carrierShipment,
        status: 'PENDING',
        ownerId: null,
      });
      const acceptDto: UpdateShipmentStatusDto = { status: 'ACCEPTED' };

      await expect(
        shipmentsService.updateStatus('user-manager', 'shipment-1', acceptDto),
      ).rejects.toThrow(BadRequestException);
      expect(shipmentUpdateMany).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the status changed concurrently (updateMany affects 0 rows)', async () => {
      // Regression test: two concurrent requests both validating against
      // the same read (e.g. the owner and the manager both submitting
      // "Advance to COLLECTED" moments apart) must not both succeed and
      // both write a TrackingEvent for the same logical transition.
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(carrierShipment); // status ACCEPTED
      shipmentUpdateMany.mockResolvedValue({ count: 0 });

      await expect(
        shipmentsService.updateStatus('user-operator', 'shipment-1', dto),
      ).rejects.toThrow(ConflictException);
      expect(trackingEventCreate).not.toHaveBeenCalled();
    });
  });
});
