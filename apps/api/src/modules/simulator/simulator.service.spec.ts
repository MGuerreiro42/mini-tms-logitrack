import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ShipmentStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ShipmentsService } from '../shipments/shipments.service';
import { TrackingPresence } from '../tracking/tracking-presence';
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
  operatorUserIds: ['operator-user-1', 'operator-user-2'],
  modalities: {
    STANDARD: { id: 'standard', slaHours: 72 },
    FULL: { id: 'full', slaHours: 48 },
    EXPRESS: { id: 'express', slaHours: 24 },
  },
};

const owned = (status: ShipmentStatus) => ({
  id: 'shipment-1',
  status,
  owner: { userId: 'operator-user-1' },
});

describe('SimulatorService', () => {
  let simulator: SimulatorService;
  const hasViewers = vi.fn();
  const load = vi.fn();
  const findFirst = vi.fn();
  const count = vi.fn();
  const updateStatus = vi.fn();
  const claim = vi.fn();
  const create = vi.fn();
  const random = vi.fn();

  // advanceOne and claimOne each call findFirst once, in that order.
  const givenShipments = (toAdvance: unknown, toClaim: unknown = null) => {
    findFirst.mockResolvedValueOnce(toAdvance).mockResolvedValueOnce(toClaim);
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    hasViewers.mockResolvedValue(true);
    load.mockResolvedValue(tenant);
    random.mockReturnValue(0.5);

    const moduleRef = await Test.createTestingModule({
      providers: [
        SimulatorService,
        {
          provide: PrismaService,
          useValue: { shipment: { findFirst, count } },
        },
        {
          provide: ShipmentsService,
          useValue: { updateStatus, claim, create },
        },
        { provide: TrackingPresence, useValue: { hasViewers } },
        { provide: DemoTenantService, useValue: { load } },
        { provide: SIMULATOR_RANDOM, useValue: random },
      ],
    }).compile();
    simulator = moduleRef.get(SimulatorService);
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

  it('returns a failed delivery to the sender', async () => {
    givenShipments(owned(ShipmentStatus.FAILED_DELIVERY));

    await simulator.tick();

    expect(updateStatus).toHaveBeenCalledWith(
      'operator-user-1',
      'shipment-1',
      expect.objectContaining({ status: ShipmentStatus.RETURNED }),
    );
  });

  it('claims the oldest pending shipment for an operator', async () => {
    givenShipments(null, { id: 'pending-1' });

    await simulator.tick();

    expect(claim).toHaveBeenCalledWith('operator-user-2', 'pending-1');
  });

  it('keeps going when a visitor wins the race for a shipment', async () => {
    givenShipments(owned(ShipmentStatus.COLLECTED), { id: 'pending-1' });
    updateStatus.mockRejectedValue(new ConflictException());

    await simulator.tick();

    expect(claim).toHaveBeenCalled();
  });

  it('surfaces any error other than a lost race', async () => {
    givenShipments(owned(ShipmentStatus.COLLECTED));
    updateStatus.mockRejectedValue(new BadRequestException());

    await expect(simulator.tick()).rejects.toThrow(BadRequestException);
  });

  it('creates a shipment for a demo seller on some ticks', async () => {
    givenShipments(null);
    random.mockReturnValue(0.1);
    count.mockResolvedValue(3);

    await simulator.tick();

    expect(create).toHaveBeenCalledWith(
      'seller-user-1',
      expect.objectContaining({
        carrierId: 'carrier-1',
        modalityId: 'standard',
        addressState: 'SP',
      }),
    );
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
});
