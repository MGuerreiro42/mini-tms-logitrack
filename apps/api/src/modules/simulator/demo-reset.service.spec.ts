import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { REDIS_CLIENT } from '../../shared/redis/redis.module';
import { MS_PER_HOUR } from '../../shared/stats/stats';
import { DEMO_SHIPMENT_COUNT } from './demo-dataset';
import { DEMO_RESET } from './demo-events';
import { DemoResetService, LAST_RESET_KEY } from './demo-reset.service';
import { DemoTenantService } from './demo-tenant.service';

const tenant = {
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
  extraCarriers: {},
  modalities: {
    STANDARD: { id: 'standard', slaHours: 72 },
    FULL: { id: 'full', slaHours: 48 },
    EXPRESS: { id: 'express', slaHours: 24 },
  },
};

describe('DemoResetService', () => {
  let service: DemoResetService;
  const load = vi.fn();
  const transaction = vi.fn();
  const shipmentCreateMany = vi.fn();
  const eventCreateMany = vi.fn();
  const emitAsync = vi.fn();
  const redisGet = vi.fn();
  const redisSet = vi.fn();

  beforeEach(async () => {
    vi.resetAllMocks();
    load.mockResolvedValue(tenant);

    const moduleRef = await Test.createTestingModule({
      providers: [
        DemoResetService,
        { provide: DemoTenantService, useValue: { load } },
        {
          provide: PrismaService,
          useValue: {
            $transaction: transaction,
            shipment: { deleteMany: vi.fn(), createMany: shipmentCreateMany },
            trackingEvent: {
              deleteMany: vi.fn(),
              createMany: eventCreateMany,
            },
          },
        },
        { provide: EventEmitter2, useValue: { emitAsync } },
        {
          provide: REDIS_CLIENT,
          useValue: { get: redisGet, set: redisSet },
        },
      ],
    }).compile();
    service = moduleRef.get(DemoResetService);
  });

  it('rebuilds the demo shipments in one batch, linking each event to its shipment', async () => {
    await service.reset();

    expect(transaction).toHaveBeenCalledOnce();
    const [{ data: shipments }] = shipmentCreateMany.mock.calls[0];
    const [{ data: events }] = eventCreateMany.mock.calls[0];
    const shipmentIds = new Set(shipments.map((s: { id: string }) => s.id));

    expect(shipments).toHaveLength(DEMO_SHIPMENT_COUNT);
    expect(shipmentIds.size).toBe(DEMO_SHIPMENT_COUNT);
    expect(
      events.every((e: { shipmentId: string }) =>
        shipmentIds.has(e.shipmentId),
      ),
    ).toBe(true);
  });

  it('records the reset and tells the clients once the batch has committed', async () => {
    await service.reset();

    expect(redisSet).toHaveBeenCalledWith(LAST_RESET_KEY, expect.any(Number));
    expect(emitAsync).toHaveBeenCalledWith(DEMO_RESET, {
      sellerIds: ['seller-1', 'seller-2'],
    });
    expect(transaction.mock.invocationCallOrder[0]).toBeLessThan(
      emitAsync.mock.invocationCallOrder[0],
    );
  });

  it('skips the reset when the demo tenant was never seeded', async () => {
    load.mockResolvedValue(null);

    await service.reset();

    expect(transaction).not.toHaveBeenCalled();
    expect(emitAsync).not.toHaveBeenCalled();
  });

  it.each([
    { when: 'no reset was ever recorded', lastReset: null, overdue: true },
    {
      when: 'the last reset is over a day old',
      lastReset: Date.now() - 25 * MS_PER_HOUR,
      overdue: true,
    },
    {
      when: 'the last reset is recent',
      lastReset: Date.now() - MS_PER_HOUR,
      overdue: false,
    },
  ])('when $when, isOverdue is $overdue', async ({ lastReset, overdue }) => {
    redisGet.mockResolvedValue(lastReset === null ? null : String(lastReset));

    await expect(service.isOverdue()).resolves.toBe(overdue);
  });
});
