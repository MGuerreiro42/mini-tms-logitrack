import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { DEMO_SELLERS } from '../simulator/demo-dataset';
import type { CreateShipmentDto } from './dto/create-shipment.dto';
import type { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { SHIPMENT_UPDATED, VEHICLE_POSITION_REPORTED } from './shipment-events';
import { ShipmentsService } from './shipments.service';
import { VehiclePositions } from './vehicle-positions';

const page = { page: 1, limit: 20 };

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
  const shipmentFindUnique = vi.fn();
  const shipmentCount = vi.fn();
  const shipmentGroupBy = vi.fn();
  const shipmentUpdateManyAndReturn = vi.fn();
  const shipmentFindUniqueOrThrow = vi.fn();
  const trackingEventCreate = vi.fn();
  const trackingEventFindMany = vi.fn();
  const transaction = vi.fn();
  const emit = vi.fn();
  const saveIfNewer = vi.fn();
  const latest = vi.fn();

  const dto: CreateShipmentDto = {
    addressStreet: 'Av. Paulista',
    addressNumber: '1000',
    addressNeighborhood: 'Bela Vista',
    addressCity: 'São Paulo',
    addressState: 'SP',
    addressZipCode: '01310100',
    modalityId: 'modality-1',
    carrierId: 'carrier-1',
  };

  const approvedSeller = {
    id: 'seller-1',
    userId: 'user-1',
    status: 'APPROVED',
  };

  // A demo seller at a demo address, so the shipment has a route.
  const demoSeller = { user: { email: DEMO_SELLERS[0].email } };

  const shipmentWithRelations = {
    seller: demoSeller,
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
    addressZipCode: '01310100',
    createdAt: new Date('2026-01-01'),
    dueAt: new Date('2026-01-04'),
    deliveredAt: null,
    trackingEvents: [],
  };

  const carrierManager = {
    id: 'carrier-user-manager',
    userId: 'user-manager',
    carrierId: 'carrier-1',
    role: 'MANAGER',
    carrier: { status: 'APPROVED' },
  };

  const carrierOperator = {
    id: 'carrier-user-operator',
    userId: 'user-operator',
    carrierId: 'carrier-1',
    role: 'OPERATOR',
    carrier: { status: 'APPROVED' },
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
    owner: { user: { email: 'operator@example.com', name: 'Ana Souza' } },
    modalityId: 'modality-1',
    modality: { name: 'Standard' },
    addressStreet: 'Av. Paulista',
    addressNumber: '1000',
    addressComplement: null,
    addressNeighborhood: 'Bela Vista',
    addressCity: 'São Paulo',
    addressState: 'SP',
    addressZipCode: '01310100',
    createdAt: new Date('2026-01-01'),
    dueAt: null,
    deliveredAt: null,
    trackingEvents: [],
  };

  const mockTransition = (shipment: object) => {
    shipmentUpdateManyAndReturn.mockResolvedValue([shipment]);
    shipmentFindUniqueOrThrow.mockResolvedValue(shipment);
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
    shipmentFindUnique.mockReset();
    shipmentCount.mockReset();
    shipmentGroupBy.mockReset();
    shipmentUpdateManyAndReturn.mockReset();
    shipmentFindUniqueOrThrow.mockReset();
    trackingEventCreate.mockReset();
    trackingEventFindMany.mockReset();
    transaction.mockReset();
    emit.mockReset();
    saveIfNewer.mockReset();
    latest.mockReset();

    const tx = {
      shipment: {
        updateManyAndReturn: shipmentUpdateManyAndReturn,
      },
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
              findUnique: shipmentFindUnique,
              findUniqueOrThrow: shipmentFindUniqueOrThrow,
              count: shipmentCount,
              groupBy: shipmentGroupBy,
            },
            trackingEvent: {
              create: trackingEventCreate,
              findMany: trackingEventFindMany,
            },
            $transaction: transaction,
          },
        },
        { provide: EventEmitter2, useValue: { emit } },
        { provide: VehiclePositions, useValue: { saveIfNewer, latest } },
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
              OR: [{ cityKey: null }, { cityKey: 'sao paulo' }],
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
    const enabledModality = {
      sellerId: 'seller-1',
      modalityId: 'modality-1',
      modality: { slaHours: 24 },
    };

    it('creates a shipment when seller is approved, modality enabled, and carrier matches', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      sellerModalityFindUnique.mockResolvedValue(enabledModality);
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
      const { data } = shipmentCreate.mock.calls[0][0];
      expect(data.dueAt.getTime() - data.createdAt.getTime()).toBe(
        24 * 3_600_000,
      );
      expect(result.trackingCode).toBe('TMS-ABC123');
      expect(result.carrierName).toBe('Fast Freight');
    });

    it('records the initial PENDING tracking event and notifies the carrier queue', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      sellerModalityFindUnique.mockResolvedValue(enabledModality);
      carrierFindFirst.mockResolvedValue({ id: 'carrier-1' });
      shipmentCreate.mockResolvedValue(shipmentWithRelations);

      await shipmentsService.create('user-1', dto);

      expect(shipmentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            trackingEvents: {
              create: {
                status: 'PENDING',
                actorId: 'user-1',
                createdAt: expect.any(Date),
              },
            },
          }),
        }),
      );
      expect(emit).toHaveBeenCalledWith(
        SHIPMENT_UPDATED,
        expect.objectContaining({
          shipmentId: shipmentWithRelations.id,
          carrierId: shipmentWithRelations.carrierId,
          status: 'PENDING',
          previousStatus: null,
        }),
      );
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

      const result = await shipmentsService.findAllForSeller('user-1', page);

      expect(shipmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ sellerId: 'seller-1' }] },
          orderBy: [{ createdAt: 'desc' }],
        }),
      );
      expect(result.meta.total).toBe(1);
      expect(result.data[0].id).toBe('shipment-1');
    });
  });

  describe('attentionForSeller', () => {
    const failed = {
      ...shipmentWithRelations,
      id: 'failed-1',
      status: 'FAILED_DELIVERY',
    };
    const late = (id: string) => ({ ...shipmentWithRelations, id });

    it('lists failed deliveries first, then late shipments in overdue order, with full counts', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      shipmentFindMany
        .mockResolvedValueOnce([failed])
        .mockResolvedValueOnce([late('late-1'), late('late-2')]);
      shipmentCount.mockResolvedValueOnce(1).mockResolvedValueOnce(7);

      const result = await shipmentsService.attentionForSeller('user-1');

      expect(shipmentFindMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { sellerId: 'seller-1', status: 'FAILED_DELIVERY' },
          take: 5,
        }),
      );
      expect(shipmentFindMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: {
            sellerId: 'seller-1',
            status: {
              in: [
                'PENDING',
                'ACCEPTED',
                'COLLECTED',
                'IN_TRANSIT',
                'OUT_FOR_DELIVERY',
              ],
            },
            dueAt: { lt: expect.any(Date) },
          },
          orderBy: { dueAt: 'asc' },
          take: 5,
        }),
      );
      expect(result.shipments.map((s) => s.id)).toEqual([
        'failed-1',
        'late-1',
        'late-2',
      ]);
      expect(result.counts).toEqual({ failed: 1, late: 7 });
    });

    it('caps the list at 5, failures first, still counting the late ones', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      shipmentFindMany
        .mockResolvedValueOnce(
          Array.from({ length: 5 }, (_, i) => ({ ...failed, id: `f-${i}` })),
        )
        .mockResolvedValueOnce([late('late-1')]);
      shipmentCount.mockResolvedValueOnce(8).mockResolvedValueOnce(1);

      const result = await shipmentsService.attentionForSeller('user-1');

      expect(result.shipments.map((s) => s.status)).toEqual(
        Array(5).fill('FAILED_DELIVERY'),
      );
      expect(result.counts).toEqual({ failed: 8, late: 1 });
    });

    it('reports zero late shipments when none are overdue', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      shipmentFindMany.mockResolvedValue([]);
      shipmentCount.mockResolvedValue(0);

      const result = await shipmentsService.attentionForSeller('user-1');

      expect(result).toEqual({ shipments: [], counts: { failed: 0, late: 0 } });
    });
  });

  describe('activityForSeller', () => {
    it("lists the latest events of the seller's own shipments, flattened for the feed", async () => {
      const createdAt = new Date('2026-11-03T12:00:00Z');
      sellerFindUnique.mockResolvedValue(approvedSeller);
      trackingEventFindMany.mockResolvedValue([
        {
          id: 'event-1',
          status: 'COLLECTED',
          createdAt,
          shipment: {
            id: 'shipment-1',
            trackingCode: 'TMS-ABC123',
            addressCity: 'Sorocaba',
          },
        },
      ]);

      const result = await shipmentsService.activityForSeller('user-1', 8);

      expect(trackingEventFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { shipment: { sellerId: 'seller-1' } },
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
      );
      expect(result).toEqual([
        {
          id: 'event-1',
          shipmentId: 'shipment-1',
          trackingCode: 'TMS-ABC123',
          status: 'COLLECTED',
          city: 'Sorocaba',
          createdAt,
        },
      ]);
    });

    it('rejects a user with no seller profile', async () => {
      sellerFindUnique.mockResolvedValue(null);

      await expect(
        shipmentsService.activityForSeller('user-1', 8),
      ).rejects.toThrow(NotFoundException);
      expect(trackingEventFindMany).not.toHaveBeenCalled();
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
      expect(result.dueAt).toEqual(new Date('2026-01-04'));
      expect(result.trackingEvents).toEqual([]);
      expect(result.map?.destination).toHaveLength(2);
      expect(result.lastPosition).toBeNull();
      expect(latest).not.toHaveBeenCalled();
    });

    it('includes the latest position while the shipment is on the road', async () => {
      const position = {
        lat: -23.5,
        lng: -46.6,
        heading: null,
        recordedAt: new Date(),
      };
      sellerFindUnique.mockResolvedValue(approvedSeller);
      shipmentFindFirst.mockResolvedValue({
        ...shipmentWithRelations,
        status: 'OUT_FOR_DELIVERY',
      });
      latest.mockResolvedValue(position);

      const result = await shipmentsService.findOneForSeller(
        'user-1',
        'shipment-1',
      );

      expect(latest).toHaveBeenCalledWith('shipment-1');
      expect(result.lastPosition).toBe(position);
    });

    it('still answers, without a position, when Redis is down', async () => {
      const warn = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});
      sellerFindUnique.mockResolvedValue(approvedSeller);
      shipmentFindFirst.mockResolvedValue({
        ...shipmentWithRelations,
        status: 'IN_TRANSIT',
      });
      latest.mockRejectedValue(new Error('Connection is closed.'));

      const result = await shipmentsService.findOneForSeller(
        'user-1',
        'shipment-1',
      );

      expect(result.lastPosition).toBeNull();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Connection is closed.'),
      );
      warn.mockRestore();
    });

    it('throws NotFoundException when the shipment belongs to another seller (same as not existing)', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      shipmentFindFirst.mockResolvedValue(null);

      await expect(
        shipmentsService.findOneForSeller('user-1', 'someone-elses-shipment'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('countsByStatusForSeller', () => {
    it('fills every ShipmentStatus with 0 by default, then overlays the groupBy result', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      shipmentGroupBy.mockResolvedValue([
        { status: 'PENDING', _count: 2 },
        { status: 'DELIVERED', _count: 5 },
      ]);

      const result = await shipmentsService.countsByStatusForSeller('user-1');

      expect(shipmentGroupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { sellerId: 'seller-1' },
        _count: true,
      });
      expect(result).toEqual({
        PENDING: 2,
        ACCEPTED: 0,
        COLLECTED: 0,
        IN_TRANSIT: 0,
        OUT_FOR_DELIVERY: 0,
        DELIVERED: 5,
        FAILED_DELIVERY: 0,
        CANCELLED: 0,
        RETURNED: 0,
      });
    });

    it('throws NotFoundException when the seller is not found', async () => {
      sellerFindUnique.mockResolvedValue(null);

      await expect(
        shipmentsService.countsByStatusForSeller('user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('countsByStatusForAdmin', () => {
    it('counts platform-wide without filters', async () => {
      shipmentGroupBy.mockResolvedValue([{ status: 'IN_TRANSIT', _count: 3 }]);

      const result = await shipmentsService.countsByStatusForAdmin();

      expect(shipmentGroupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: {},
        _count: true,
      });
      expect(result.IN_TRANSIT).toBe(3);
      expect(result.PENDING).toBe(0);
    });

    it('scopes the counts to the given carrier and seller', async () => {
      shipmentGroupBy.mockResolvedValue([]);

      await shipmentsService.countsByStatusForAdmin('carrier-1', 'seller-1');

      expect(shipmentGroupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { carrierId: 'carrier-1', sellerId: 'seller-1' },
        }),
      );
    });
  });

  describe('slaSummaryForSeller', () => {
    const dueAt = new Date('2026-01-02T00:00:00Z');
    let nextId = 0;
    const delivered = (
      hours: number | null,
      code = 'EXPRESS',
      extra: object = {},
    ) => ({
      id: `s-${nextId++}`,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      status: 'DELIVERED',
      dueAt: hours === null ? null : dueAt,
      deliveredAt: new Date(dueAt.getTime() + (hours ?? 0) * 3_600_000),
      modality: { code, name: code.toLowerCase() },
      ...extra,
    });

    // The implementation before the metrics core, kept to prove the move changed no output.
    const legacySlaSummary = (shipments: ReturnType<typeof delivered>[]) => {
      const byModality = new Map<
        string,
        { modalityName: string; deliveredCount: number; onTimeCount: number }
      >();
      for (const { dueAt, deliveredAt, modality } of shipments) {
        if (!dueAt || !deliveredAt) continue;
        const entry = byModality.get(modality.code) ?? {
          modalityName: modality.name,
          deliveredCount: 0,
          onTimeCount: 0,
        };
        entry.deliveredCount += 1;
        if (deliveredAt <= dueAt) entry.onTimeCount += 1;
        byModality.set(modality.code, entry);
      }
      return Array.from(byModality.entries()).map(([modalityCode, entry]) => ({
        modalityCode,
        ...entry,
        onTimeRate: (entry.onTimeCount / entry.deliveredCount) * 100,
      }));
    };

    beforeEach(() => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      trackingEventFindMany.mockResolvedValue([]);
    });

    it('groups DELIVERED shipments by modality and computes on-time rate from the stored dates', async () => {
      shipmentFindMany.mockResolvedValue([delivered(-12), delivered(6)]);

      const since = new Date('2025-12-01T00:00:00Z');
      const result = await shipmentsService.slaSummaryForSeller(
        'user-1',
        since,
      );

      expect(shipmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sellerId: 'seller-1',
            status: 'DELIVERED',
            createdAt: { gte: since },
          },
        }),
      );
      expect(result).toEqual([
        {
          modalityCode: 'EXPRESS',
          modalityName: 'express',
          deliveredCount: 2,
          onTimeCount: 1,
          onTimeRate: 50,
        },
      ]);
    });

    it('omits modalities with no slaHours configured', async () => {
      shipmentFindMany.mockResolvedValue([delivered(null, 'STANDARD')]);

      const result = await shipmentsService.slaSummaryForSeller('user-1');

      expect(result).toEqual([]);
    });

    it('returns what the implementation before the metrics core returned', async () => {
      const rows = [
        delivered(null, 'STANDARD'),
        delivered(0, 'EXPRESS'),
        delivered(3, 'STANDARD'),
        delivered(-1, 'ECONOMY'),
        delivered(5, 'EXPRESS', { deliveredAt: null }),
        delivered(-4, 'STANDARD'),
        delivered(0.01, 'EXPRESS'),
      ];
      shipmentFindMany.mockResolvedValue(rows);

      const result = await shipmentsService.slaSummaryForSeller('user-1');

      expect(result).toEqual(legacySlaSummary(rows));
      expect(result.map((item) => item.modalityCode)).toEqual([
        'EXPRESS',
        'STANDARD',
        'ECONOMY',
      ]);
    });

    it('throws NotFoundException when the seller is not found', async () => {
      sellerFindUnique.mockResolvedValue(null);

      await expect(
        shipmentsService.slaSummaryForSeller('user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('cancels a PENDING shipment: conditional write, CANCELLED event with note, emits', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      shipmentFindFirst.mockResolvedValue({ status: 'PENDING' });
      mockTransition({
        ...shipmentWithRelations,
        sellerId: 'seller-1',
        status: 'CANCELLED',
      });

      const result = await shipmentsService.cancel('user-1', 'shipment-1', {
        note: 'Customer gave up',
      });

      expect(shipmentFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shipment-1', sellerId: 'seller-1' },
        }),
      );
      expect(shipmentUpdateManyAndReturn).toHaveBeenCalledWith({
        where: {
          id: 'shipment-1',
          sellerId: 'seller-1',
          status: 'PENDING',
        },
        data: { status: 'CANCELLED' },
      });
      expect(trackingEventCreate).toHaveBeenCalledWith({
        data: {
          shipmentId: 'shipment-1',
          status: 'CANCELLED',
          note: 'Customer gave up',
          actorId: 'user-1',
          createdAt: expect.any(Date),
        },
      });
      expect(emit).toHaveBeenCalledWith(
        SHIPMENT_UPDATED,
        expect.objectContaining({
          shipmentId: 'shipment-1',
          carrierId: 'carrier-1',
          sellerId: 'seller-1',
          status: 'CANCELLED',
          previousStatus: 'PENDING',
        }),
      );
      expect(result.status).toBe('CANCELLED');
    });

    it('cancels an ACCEPTED shipment', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      shipmentFindFirst.mockResolvedValue({ status: 'ACCEPTED' });
      mockTransition({
        ...shipmentWithRelations,
        status: 'CANCELLED',
      });

      await shipmentsService.cancel('user-1', 'shipment-1', {});

      expect(trackingEventCreate).toHaveBeenCalled();
    });

    it("throws NotFoundException for another seller's shipment (same as not existing)", async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      shipmentFindFirst.mockResolvedValue(null);

      await expect(
        shipmentsService.cancel('user-1', 'someone-elses-shipment', {}),
      ).rejects.toThrow(NotFoundException);
      expect(shipmentUpdateManyAndReturn).not.toHaveBeenCalled();
    });

    it('cancels once more when a claim lands between the read and the write', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      shipmentFindFirst
        .mockResolvedValueOnce({ status: 'PENDING' })
        .mockResolvedValueOnce({ status: 'ACCEPTED' });
      const cancelled = { ...shipmentWithRelations, status: 'CANCELLED' };
      shipmentUpdateManyAndReturn
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([cancelled]);
      shipmentFindUniqueOrThrow.mockResolvedValue(cancelled);

      await shipmentsService.cancel('user-1', 'shipment-1', {});

      expect(shipmentUpdateManyAndReturn).toHaveBeenLastCalledWith({
        where: { id: 'shipment-1', sellerId: 'seller-1', status: 'ACCEPTED' },
        data: { status: 'CANCELLED' },
      });
      expect(emit).toHaveBeenCalledWith(
        SHIPMENT_UPDATED,
        expect.objectContaining({ previousStatus: 'ACCEPTED' }),
      );
    });

    it('throws ConflictException once the shipment has been collected', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      shipmentFindFirst.mockResolvedValue({ status: 'COLLECTED' });

      await expect(
        shipmentsService.cancel('user-1', 'shipment-1', {}),
      ).rejects.toThrow(ConflictException);
      expect(shipmentUpdateManyAndReturn).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a carrier advances it concurrently (the conditional update matches 0 rows)', async () => {
      sellerFindUnique.mockResolvedValue(approvedSeller);
      shipmentFindFirst.mockResolvedValue({ status: 'ACCEPTED' });
      shipmentUpdateManyAndReturn.mockResolvedValue([]);

      await expect(
        shipmentsService.cancel('user-1', 'shipment-1', {}),
      ).rejects.toThrow(ConflictException);
      expect(trackingEventCreate).not.toHaveBeenCalled();
      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe('findAllForCarrier', () => {
    it('scopes the list to the carrier resolved from userId', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindMany.mockResolvedValue([carrierShipment]);
      shipmentCount.mockResolvedValue(1);

      const result = await shipmentsService.findAllForCarrier(
        'user-operator',
        page,
      );

      expect(shipmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ carrierId: 'carrier-1' }] },
        }),
      );
      expect(result.data[0].sellerCompanyName).toBe('Acme Store');
      expect(result.data[0].ownerEmail).toBe('operator@example.com');
      expect(result.data[0].ownerName).toBe('Ana Souza');
    });

    it('throws NotFoundException when the user has no CarrierUser profile', async () => {
      carrierUserFindUnique.mockResolvedValue(null);

      await expect(
        shipmentsService.findAllForCarrier('stranger', page),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('carrier approval', () => {
    const operations = [
      [
        'findAllForCarrier',
        () => shipmentsService.findAllForCarrier('u', page),
      ],
      [
        'findOneForCarrier',
        () => shipmentsService.findOneForCarrier('u', 'shipment-1'),
      ],
      ['claim', () => shipmentsService.claim('u', 'shipment-1')],
      [
        'updateStatus',
        () =>
          shipmentsService.updateStatus('u', 'shipment-1', {
            status: 'COLLECTED',
          }),
      ],
    ] as const;

    for (const status of ['PENDING', 'REJECTED']) {
      it.each(operations)(
        `%s throws ForbiddenException for a ${status} carrier`,
        async (_name, operation) => {
          carrierUserFindUnique.mockResolvedValue({
            ...carrierManager,
            carrier: { status },
          });

          await expect(operation()).rejects.toThrow(ForbiddenException);
          expect(shipmentFindMany).not.toHaveBeenCalled();
          expect(shipmentFindFirst).not.toHaveBeenCalled();
          expect(shipmentUpdateManyAndReturn).not.toHaveBeenCalled();
        },
      );
    }
  });

  describe('findAllForAdmin', () => {
    it('applies no ownership scoping and includes the carrier company name', async () => {
      shipmentFindMany.mockResolvedValue([
        { ...carrierShipment, carrier: { companyName: 'Fast Freight' } },
      ]);
      shipmentCount.mockResolvedValue(1);

      const result = await shipmentsService.findAllForAdmin(page);

      expect(shipmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { AND: [{}] } }),
      );
      expect(result.data[0].carrierCompanyName).toBe('Fast Freight');
      expect(result.data[0].sellerCompanyName).toBe('Acme Store');
    });

    it('filters by status, carrierId, and sellerId together when provided', async () => {
      shipmentFindMany.mockResolvedValue([]);
      shipmentCount.mockResolvedValue(0);

      await shipmentsService.findAllForAdmin({
        status: 'DELIVERED',
        carrierId: 'carrier-1',
        sellerId: 'seller-1',
        page: 2,
        limit: 10,
      });

      expect(shipmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { carrierId: 'carrier-1', sellerId: 'seller-1' },
              { status: 'DELIVERED' },
            ],
          },
          skip: 10,
          take: 10,
        }),
      );
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
      expect(result.dueAt).toBeNull();
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

  describe('claimNext', () => {
    // claimAs is private; the spy stands in for the conditional write it wraps.
    const spyClaimAs = () =>
      vi.spyOn(
        shipmentsService as unknown as { claimAs: () => Promise<unknown> },
        'claimAs',
      );

    it('moves on to the next candidate when one is lost, resolving the caller once', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
      const claimAs = spyClaimAs()
        .mockRejectedValueOnce(new ConflictException())
        .mockResolvedValueOnce(carrierShipment);

      await expect(shipmentsService.claimNext('u')).resolves.toBe(
        carrierShipment,
      );
      expect(claimAs.mock.calls.map((call) => (call as unknown[])[1])).toEqual([
        'a',
        'b',
      ]);
      expect(carrierUserFindUnique).toHaveBeenCalledOnce();
    });

    it.each([
      [3, 'Others claimed these first, try again'],
      [2, 'No shipment is waiting to be claimed'],
    ])('with %i candidates all lost answers %s', async (count, message) => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindMany.mockResolvedValue(
        Array.from({ length: count }, (_, i) => ({ id: `s-${i}` })),
      );
      spyClaimAs().mockRejectedValue(new ConflictException());

      await expect(shipmentsService.claimNext('u')).rejects.toThrow(message);
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
      mockTransition(carrierShipment);

      const result = await shipmentsService.claim(
        'user-operator',
        'shipment-1',
      );

      expect(shipmentUpdateManyAndReturn).toHaveBeenCalledWith({
        where: {
          id: 'shipment-1',
          carrierId: 'carrier-1',
          ownerId: null,
          status: 'PENDING',
        },
        data: { ownerId: 'carrier-user-operator', status: 'ACCEPTED' },
      });
      expect(trackingEventCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shipmentId: 'shipment-1',
          status: 'ACCEPTED',
          actorId: 'user-operator',
        }),
      });
      expect(emit).toHaveBeenCalledWith(
        'shipment.updated',
        expect.objectContaining({
          shipmentId: 'shipment-1',
          status: 'ACCEPTED',
          previousStatus: 'PENDING',
        }),
      );
      expect(result.id).toBe('shipment-1');
    });

    it('returns and emits the status this request wrote when a later transition lands right after commit', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(pendingShipment);
      shipmentUpdateManyAndReturn.mockResolvedValue([carrierShipment]);
      shipmentFindUniqueOrThrow.mockResolvedValue({
        ...carrierShipment,
        status: 'COLLECTED',
      });

      const result = await shipmentsService.claim(
        'user-operator',
        'shipment-1',
      );

      expect(result.status).toBe('ACCEPTED');
      expect(emit).toHaveBeenCalledTimes(1);
      expect(emit).toHaveBeenCalledWith(
        SHIPMENT_UPDATED,
        expect.objectContaining({ status: 'ACCEPTED' }),
      );
    });

    it('throws NotFoundException for a shipment belonging to another carrier', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(null);

      await expect(
        shipmentsService.claim('user-operator', 'other-carriers-shipment'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException for a cancelled (unowned) shipment', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue({
        ...pendingShipment,
        status: 'CANCELLED',
      });

      await expect(
        shipmentsService.claim('user-operator', 'shipment-1'),
      ).rejects.toThrow(ConflictException);
      expect(shipmentUpdateManyAndReturn).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the pre-check already sees an owner', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierManager);
      shipmentFindFirst.mockResolvedValue(carrierShipment);

      await expect(
        shipmentsService.claim('user-manager', 'shipment-1'),
      ).rejects.toThrow(ConflictException);
      expect(shipmentUpdateManyAndReturn).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a concurrent claim wins the race (the conditional update matches 0 rows)', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(pendingShipment);
      shipmentUpdateManyAndReturn.mockResolvedValue([]);

      await expect(
        shipmentsService.claim('user-operator', 'shipment-1'),
      ).rejects.toThrow(ConflictException);
      expect(trackingEventCreate).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    const dto: UpdateShipmentStatusDto = { status: 'COLLECTED' };
    const acceptedAndOwnedByOperator = carrierShipment;

    it('allows the owning operator to advance a valid transition', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(acceptedAndOwnedByOperator);
      mockTransition({
        ...carrierShipment,
        status: 'COLLECTED',
      });

      const result = await shipmentsService.updateStatus(
        'user-operator',
        'shipment-1',
        dto,
      );

      expect(shipmentUpdateManyAndReturn).toHaveBeenCalledWith({
        where: { id: 'shipment-1', status: 'ACCEPTED' },
        data: { status: 'COLLECTED' },
      });
      expect(emit).toHaveBeenCalledWith(
        SHIPMENT_UPDATED,
        expect.objectContaining({
          status: 'COLLECTED',
          previousStatus: 'ACCEPTED',
        }),
      );
      expect(result.status).toBe('COLLECTED');
    });

    it('stamps deliveredAt with the moment of the DELIVERED event', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue({
        ...carrierShipment,
        status: 'OUT_FOR_DELIVERY',
      });
      mockTransition({ ...carrierShipment, status: 'DELIVERED' });

      await shipmentsService.updateStatus('user-operator', 'shipment-1', {
        status: 'DELIVERED',
      });

      const [{ data: shipment }] = shipmentUpdateManyAndReturn.mock.calls[0];
      const [{ data: event }] = trackingEventCreate.mock.calls[0];
      expect(shipment.deliveredAt).toBeInstanceOf(Date);
      expect(event).toMatchObject({
        status: 'DELIVERED',
        actorId: 'user-operator',
        createdAt: shipment.deliveredAt,
      });
    });

    it('allows the manager to advance a shipment they do not own', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierManager);
      shipmentFindFirst.mockResolvedValue(acceptedAndOwnedByOperator);
      mockTransition({
        ...carrierShipment,
        status: 'COLLECTED',
      });

      await shipmentsService.updateStatus('user-manager', 'shipment-1', dto);

      expect(shipmentUpdateManyAndReturn).toHaveBeenCalled();
    });

    it('throws ForbiddenException for a non-owning operator', async () => {
      const otherOperator = { ...carrierOperator, id: 'someone-else' };
      carrierUserFindUnique.mockResolvedValue(otherOperator);
      shipmentFindFirst.mockResolvedValue(acceptedAndOwnedByOperator);

      await expect(
        shipmentsService.updateStatus('user-other', 'shipment-1', dto),
      ).rejects.toThrow(ForbiddenException);
      expect(shipmentUpdateManyAndReturn).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for an invalid transition', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(acceptedAndOwnedByOperator);
      const skipAheadDto: UpdateShipmentStatusDto = { status: 'DELIVERED' };

      await expect(
        shipmentsService.updateStatus(
          'user-operator',
          'shipment-1',
          skipAheadDto,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(shipmentUpdateManyAndReturn).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when a carrier tries to set CANCELLED, even a manager', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierManager);
      shipmentFindFirst.mockResolvedValue(acceptedAndOwnedByOperator);

      await expect(
        shipmentsService.updateStatus('user-manager', 'shipment-1', {
          status: 'CANCELLED',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(shipmentUpdateManyAndReturn).not.toHaveBeenCalled();
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
      expect(shipmentUpdateManyAndReturn).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the status changed concurrently (the conditional update matches 0 rows)', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(acceptedAndOwnedByOperator);
      shipmentUpdateManyAndReturn.mockResolvedValue([]);

      await expect(
        shipmentsService.updateStatus('user-operator', 'shipment-1', dto),
      ).rejects.toThrow(ConflictException);
      expect(trackingEventCreate).not.toHaveBeenCalled();
    });
  });

  describe('reportPosition', () => {
    const inTransit = { ...carrierShipment, status: 'IN_TRANSIT' };
    const ping = (offsetMs = 0) => ({
      lat: -23.5,
      lng: -46.6,
      heading: 90,
      recordedAt: new Date(Date.now() + offsetMs),
    });

    // The status re-read after the write.
    const stillIn = (status: string) =>
      shipmentFindUnique.mockResolvedValue({
        ...inTransit,
        seller: demoSeller,
        status,
      });

    it('stores the position and broadcasts it when it is the newest', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(inTransit);
      saveIfNewer.mockResolvedValue(true);
      stillIn('IN_TRANSIT');
      const dto = ping();

      await expect(
        shipmentsService.reportPosition('user-operator', 'shipment-1', dto),
      ).resolves.toEqual({ applied: true });

      expect(saveIfNewer).toHaveBeenCalledWith('shipment-1', dto);
      expect(emit).toHaveBeenCalledWith(VEHICLE_POSITION_REPORTED, {
        shipmentId: 'shipment-1',
        carrierId: 'carrier-1',
        sellerId: 'seller-1',
        trackingCode: 'TMS-ABC123',
        status: 'IN_TRANSIT',
        ...dto,
        publiclyVisible: true,
      });
    });

    it('broadcasts with the status read after the write', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(inTransit);
      saveIfNewer.mockResolvedValue(true);
      stillIn('OUT_FOR_DELIVERY');

      await shipmentsService.reportPosition(
        'user-operator',
        'shipment-1',
        ping(),
      );

      expect(emit).toHaveBeenCalledWith(
        VEHICLE_POSITION_REPORTED,
        expect.objectContaining({
          status: 'OUT_FOR_DELIVERY',
          publiclyVisible: false,
        }),
      );
    });

    it('stays quiet when the shipment left the road during the write', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(inTransit);
      saveIfNewer.mockResolvedValue(true);
      stillIn('DELIVERED');

      await expect(
        shipmentsService.reportPosition('user-operator', 'shipment-1', ping()),
      ).resolves.toEqual({ applied: true });
      expect(emit).not.toHaveBeenCalled();
    });

    it('accepts an older ping without broadcasting it', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierManager);
      shipmentFindFirst.mockResolvedValue(inTransit);
      saveIfNewer.mockResolvedValue(false);

      await expect(
        shipmentsService.reportPosition('user-manager', 'shipment-1', ping()),
      ).resolves.toEqual({ applied: false });
      expect(emit).not.toHaveBeenCalled();
    });

    it('stores a missing heading as null', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(inTransit);
      saveIfNewer.mockResolvedValue(true);
      stillIn('IN_TRANSIT');
      const { heading: _, ...withoutHeading } = ping();

      await shipmentsService.reportPosition(
        'user-operator',
        'shipment-1',
        withoutHeading,
      );

      expect(saveIfNewer).toHaveBeenCalledWith(
        'shipment-1',
        expect.objectContaining({ heading: null }),
      );
    });

    it('throws ForbiddenException for a non-owning operator', async () => {
      carrierUserFindUnique.mockResolvedValue({
        ...carrierOperator,
        id: 'someone-else',
      });
      shipmentFindFirst.mockResolvedValue(inTransit);

      await expect(
        shipmentsService.reportPosition('user-other', 'shipment-1', ping()),
      ).rejects.toThrow(ForbiddenException);
      expect(saveIfNewer).not.toHaveBeenCalled();
    });

    it('throws ConflictException off the road', async () => {
      carrierUserFindUnique.mockResolvedValue(carrierOperator);
      shipmentFindFirst.mockResolvedValue(carrierShipment);

      await expect(
        shipmentsService.reportPosition('user-operator', 'shipment-1', ping()),
      ).rejects.toThrow(ConflictException);
    });

    describe('recordedAt window', () => {
      beforeEach(() => {
        vi.useFakeTimers({ now: new Date('2026-01-01T12:00:00Z') });
        carrierUserFindUnique.mockResolvedValue(carrierOperator);
        shipmentFindFirst.mockResolvedValue(inTransit);
        stillIn('IN_TRANSIT');
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it.each([
        ['exactly 10 minutes old', -600_000],
        ['exactly 5 s ahead', 5_000],
      ])('accepts a reading %s', async (_, offset) => {
        saveIfNewer.mockResolvedValue(true);

        await expect(
          shipmentsService.reportPosition(
            'user-operator',
            'shipment-1',
            ping(offset),
          ),
        ).resolves.toEqual({ applied: true });
      });

      it.each([
        ['older than 10 minutes', -600_001],
        ['more than 5 s ahead', 5_001],
      ])('rejects a reading %s', async (_, offset) => {
        await expect(
          shipmentsService.reportPosition(
            'user-operator',
            'shipment-1',
            ping(offset),
          ),
        ).rejects.toThrow(BadRequestException);
        expect(saveIfNewer).not.toHaveBeenCalled();
      });
    });
  });
});
