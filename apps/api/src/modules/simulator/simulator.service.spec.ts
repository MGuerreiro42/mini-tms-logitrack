import { BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ShipmentStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { pointAt, segmentFor } from '../shipments/route-geometry';
import { findRoute } from '../shipments/routes';
import { ShipmentsService } from '../shipments/shipments.service';
import { TrackingPresence } from '../tracking/tracking-presence';
import { ChaosService } from './chaos.service';
import { DEMO_SELLERS } from './demo-dataset';
import {
  DemoTenantService,
  type LoadedDemoTenant,
} from './demo-tenant.service';
import { SIMULATOR_RANDOM } from './simulator.constants';
import { SimulatorService } from './simulator.service';

const tenant: LoadedDemoTenant = {
  sellerIds: ['seller-1', 'seller-2'],
  sellerUserIds: ['seller-user-1', 'seller-user-2'],
  carrierId: 'carrier-1',
  carrierUserIds: {
    'carrier@demo.minitms.dev': 'manager',
    'operator1@demo.minitms.dev': 'operator-1',
    'operator2@demo.minitms.dev': 'operator-2',
  },
  memberUserIds: {
    'carrier@demo.minitms.dev': 'manager-user',
    'operator1@demo.minitms.dev': 'operator-user-1',
    'operator2@demo.minitms.dev': 'operator-user-2',
  },
  claimUserIds: {
    'carrier-1': ['operator-user-1', 'operator-user-2'],
    'carrier-2': ['extra-manager-user'],
  },
  modalities: {
    STANDARD: { id: 'standard', slaHours: 72 },
    FULL: { id: 'full', slaHours: 48 },
    EXPRESS: { id: 'express', slaHours: 24 },
  },
};

const NOW = new Date('2026-01-01T12:00:00Z').getTime();
const MINUTE = 60_000;

// The stage started long enough ago that even a road stage has arrived.
const owned = (status: ShipmentStatus, stageAgeMs = 60 * MINUTE) => ({
  id: 'shipment-1',
  status,
  owner: { userId: 'operator-user-1' },
  trackingEvents: [{ createdAt: new Date(NOW - stageAgeMs) }],
});

describe('SimulatorService', () => {
  let simulator: SimulatorService;
  const hasViewers = vi.fn();
  const load = vi.fn();
  const findFirst = vi.fn();
  const findMany = vi.fn();
  const count = vi.fn();
  const updateStatus = vi.fn();
  const claim = vi.fn();
  const create = vi.fn();
  const findEligibleCarriers = vi.fn();
  const reportPosition = vi.fn();
  const random = vi.fn();
  const activeChaos = vi.fn();

  // advanceOne lists the candidates, then claimOne picks one pending shipment.
  const givenShipments = (toAdvance: unknown, toClaim: unknown = null) => {
    findMany.mockResolvedValueOnce(toAdvance ? [toAdvance] : []);
    findFirst.mockResolvedValueOnce(toClaim);
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    hasViewers.mockResolvedValue(true);
    load.mockResolvedValue(tenant);
    random.mockReturnValue(0.5);
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });

    const moduleRef = await Test.createTestingModule({
      providers: [
        SimulatorService,
        {
          provide: PrismaService,
          useValue: { shipment: { findFirst, findMany, count } },
        },
        {
          provide: ShipmentsService,
          useValue: {
            updateStatus,
            claim,
            create,
            findEligibleCarriers,
            reportPosition,
          },
        },
        { provide: TrackingPresence, useValue: { hasViewers } },
        { provide: DemoTenantService, useValue: { load } },
        { provide: ChaosService, useValue: { active: activeChaos } },
        { provide: SIMULATOR_RANDOM, useValue: random },
      ],
    }).compile();
    simulator = moduleRef.get(SimulatorService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing while nobody is watching', async () => {
    hasViewers.mockResolvedValue(false);

    await simulator.tick();

    expect(load).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('stays idle when the demo tenant was never seeded', async () => {
    load.mockResolvedValue(null);

    await simulator.tick();

    expect(findFirst).not.toHaveBeenCalled();
  });

  it('advances the stalest owned shipment one step, as its owner', async () => {
    givenShipments(owned(ShipmentStatus.COLLECTED));

    await simulator.tick();

    expect(updateStatus).toHaveBeenCalledWith('operator-user-1', 'shipment-1', {
      status: ShipmentStatus.IN_TRANSIT,
      note: undefined,
    });
  });

  it('delivers most shipments out for delivery', async () => {
    givenShipments(owned(ShipmentStatus.OUT_FOR_DELIVERY));

    await simulator.tick();

    expect(updateStatus).toHaveBeenCalledWith(
      'operator-user-1',
      'shipment-1',
      expect.objectContaining({ status: ShipmentStatus.DELIVERED }),
    );
  });

  it('fails a minority of deliveries, with the seed note', async () => {
    random.mockReturnValueOnce(0.01);
    givenShipments(owned(ShipmentStatus.OUT_FOR_DELIVERY));

    await simulator.tick();

    expect(updateStatus).toHaveBeenCalledWith('operator-user-1', 'shipment-1', {
      status: ShipmentStatus.FAILED_DELIVERY,
      note: 'Recipient not at home',
    });
  });

  it('fails about half of the deliveries during the storm', async () => {
    activeChaos.mockResolvedValue({ scenario: 'failed-deliveries' });
    random.mockReturnValueOnce(0.4);
    givenShipments(owned(ShipmentStatus.OUT_FOR_DELIVERY));

    await simulator.tick();

    expect(updateStatus).toHaveBeenCalledWith(
      'operator-user-1',
      'shipment-1',
      expect.objectContaining({ status: ShipmentStatus.FAILED_DELIVERY }),
    );
    expect(activeChaos).toHaveBeenCalledOnce();
  });

  it('neither claims nor advances for Transportadora Demo during its outage', async () => {
    activeChaos.mockResolvedValue({ scenario: 'carrier-outage' });
    givenShipments(null);

    await simulator.tick();

    const worked = { in: ['carrier-2'] };
    expect(findMany.mock.calls[0][0].where.carrierId).toEqual(worked);
    expect(findFirst.mock.calls[0][0].where.carrierId).toEqual(worked);
  });

  it('returns a failed delivery to the sender', async () => {
    givenShipments(owned(ShipmentStatus.FAILED_DELIVERY));

    await simulator.tick();

    expect(updateStatus).toHaveBeenCalledWith(
      'operator-user-1',
      'shipment-1',
      expect.objectContaining({ status: ShipmentStatus.RETURNED }),
    );
  });

  it('leaves a road stage alone until the vehicle arrives', async () => {
    givenShipments(owned(ShipmentStatus.IN_TRANSIT, 3 * MINUTE));

    await simulator.tick();

    expect(updateStatus).not.toHaveBeenCalled();
  });

  it('ends every arrived road stage and moves the longest-waiting other shipment', async () => {
    findMany.mockResolvedValueOnce([
      { ...owned(ShipmentStatus.OUT_FOR_DELIVERY, MINUTE), id: 'driving' },
      { ...owned(ShipmentStatus.IN_TRANSIT, 5 * MINUTE), id: 'arrived-1' },
      {
        ...owned(ShipmentStatus.OUT_FOR_DELIVERY, 3 * MINUTE),
        id: 'arrived-2',
      },
      { ...owned(ShipmentStatus.COLLECTED, 5 * MINUTE), id: 'collected' },
      { ...owned(ShipmentStatus.ACCEPTED, 8 * MINUTE), id: 'accepted' },
    ]);
    findFirst.mockResolvedValueOnce(null);

    await simulator.tick();

    expect(updateStatus.mock.calls.map(([, id]) => id)).toEqual([
      'arrived-1',
      'arrived-2',
      'accepted',
    ]);
  });

  it('claims the oldest pending shipment for an operator', async () => {
    givenShipments(null, { id: 'pending-1', carrierId: 'carrier-1' });

    await simulator.tick();

    expect(claim).toHaveBeenCalledWith('operator-user-2', 'pending-1');
  });

  it("claims another demo carrier's shipment as that carrier's user", async () => {
    givenShipments(null, { id: 'pending-2', carrierId: 'carrier-2' });

    await simulator.tick();

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          carrierId: { in: ['carrier-1', 'carrier-2'] },
        }),
      }),
    );
    expect(claim).toHaveBeenCalledWith('extra-manager-user', 'pending-2');
  });

  it('keeps going when a visitor wins the race for a shipment', async () => {
    givenShipments(owned(ShipmentStatus.COLLECTED), {
      id: 'pending-1',
      carrierId: 'carrier-1',
    });
    updateStatus.mockRejectedValue(new ConflictException());

    await simulator.tick();

    expect(claim).toHaveBeenCalled();
  });

  it('surfaces any error other than a lost race', async () => {
    givenShipments(owned(ShipmentStatus.COLLECTED));
    updateStatus.mockRejectedValue(new BadRequestException());

    await expect(simulator.tick()).rejects.toThrow(BadRequestException);
  });

  it('creates a shipment for a demo seller with an eligible demo carrier on some ticks', async () => {
    givenShipments(null);
    random.mockReturnValue(0.9);
    random.mockReturnValueOnce(0.1);
    count.mockResolvedValue(3);
    findEligibleCarriers.mockResolvedValue([
      { id: 'carrier-1' },
      { id: 'real-carrier' },
      { id: 'carrier-2' },
    ]);

    await simulator.tick();

    expect(findEligibleCarriers).toHaveBeenCalledWith(
      'SP',
      expect.any(String),
      'express',
    );
    expect(create).toHaveBeenCalledWith(
      'seller-user-2',
      expect.objectContaining({
        carrierId: 'carrier-2',
        modalityId: 'express',
        addressState: 'SP',
      }),
    );
  });

  it('creates nothing when no demo carrier serves the address and modality', async () => {
    givenShipments(null);
    random.mockReturnValue(0.1);
    count.mockResolvedValue(3);
    findEligibleCarriers.mockResolvedValue([{ id: 'real-carrier' }]);

    await simulator.tick();

    expect(create).not.toHaveBeenCalled();
  });

  it('stops creating once the demo has enough shipments in flight', async () => {
    givenShipments(null);
    random.mockReturnValue(0.1);
    count.mockResolvedValue(24);

    await simulator.tick();

    expect(create).not.toHaveBeenCalled();
  });

  it('skips creation on most ticks', async () => {
    givenShipments(null);

    await simulator.tick();

    expect(count).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  describe('drive', () => {
    // A demo address with a stored route.
    const onTheRoad = (status: ShipmentStatus, stageAgeMs: number) => ({
      ...owned(status, stageAgeMs),
      addressZipCode: '01310-100',
      addressNumber: '1000',
      seller: { user: { email: DEMO_SELLERS[0].email } },
    });

    it('does nothing while nobody is watching', async () => {
      hasViewers.mockResolvedValue(false);

      await simulator.drive();

      expect(findMany).not.toHaveBeenCalled();
    });

    it('reports the point along the stage, as the owner, timestamped now', async () => {
      findMany.mockResolvedValue([onTheRoad(ShipmentStatus.IN_TRANSIT, 0)]);

      await simulator.drive();

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['IN_TRANSIT', 'OUT_FOR_DELIVERY'] },
          }),
        }),
      );
      expect(reportPosition).toHaveBeenCalledWith(
        'operator-user-1',
        'shipment-1',
        {
          lng: -46.835,
          lat: -23.33605,
          heading: expect.any(Number),
          recordedAt: new Date(NOW),
        },
      );
    });

    it('moves further along as the stage runs', async () => {
      findMany
        .mockResolvedValueOnce([onTheRoad(ShipmentStatus.OUT_FOR_DELIVERY, 0)])
        .mockResolvedValueOnce([
          onTheRoad(ShipmentStatus.OUT_FOR_DELIVERY, MINUTE),
        ]);

      await simulator.drive();
      await simulator.drive();

      const route = findRoute(onTheRoad(ShipmentStatus.OUT_FOR_DELIVERY, 0));
      if (!route) throw new Error('missing route');
      const segment = segmentFor(route, ShipmentStatus.OUT_FOR_DELIVERY);
      const [start, halfway] = reportPosition.mock.calls.map(
        ([, , { recordedAt: _, ...point }]) => point,
      );
      expect(start).toEqual(pointAt(segment, 0));
      expect(halfway).toEqual(pointAt(segment, 0.5));
    });

    it('skips a shipment whose address has no route', async () => {
      findMany.mockResolvedValue([
        { ...onTheRoad(ShipmentStatus.IN_TRANSIT, 0), addressNumber: '1' },
      ]);

      await simulator.drive();

      expect(reportPosition).not.toHaveBeenCalled();
    });

    it('logs any other failure and keeps driving the others', async () => {
      const warn = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});
      findMany.mockResolvedValue([
        onTheRoad(ShipmentStatus.IN_TRANSIT, 0),
        { ...onTheRoad(ShipmentStatus.IN_TRANSIT, 0), id: 'shipment-2' },
      ]);
      reportPosition.mockRejectedValueOnce(new Error('Connection is closed.'));

      await simulator.drive();

      expect(reportPosition).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('shipment-1'));
      warn.mockRestore();
    });

    it('keeps driving the others when a status changed under it', async () => {
      findMany.mockResolvedValue([
        onTheRoad(ShipmentStatus.IN_TRANSIT, 0),
        { ...onTheRoad(ShipmentStatus.IN_TRANSIT, 0), id: 'shipment-2' },
      ]);
      reportPosition.mockRejectedValueOnce(new ConflictException());

      await simulator.drive();

      expect(reportPosition).toHaveBeenCalledTimes(2);
    });
  });
});
