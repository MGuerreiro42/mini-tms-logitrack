import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  DEMO_CARRIER_MEMBERS,
  DEMO_EXTRA_CARRIERS,
  DEMO_MODALITY_CODES,
  DEMO_SELLERS,
} from './demo-dataset';
import { DemoTenantService } from './demo-tenant.service';

const sellers = DEMO_SELLERS.map(({ email }, i) => ({
  id: `seller-user-${i}`,
  email,
  seller: { id: `seller-${i}` },
}));
const members = DEMO_CARRIER_MEMBERS.map(({ email, role }, i) => ({
  id: `member-user-${i}`,
  email,
  carrierUser: {
    id: `cu-${i}`,
    userId: `member-user-${i}`,
    carrierId: 'core',
    role,
  },
}));
const [rapido] = DEMO_EXTRA_CARRIERS.map(({ manager }, i) => ({
  id: `extra-user-${i}`,
  email: manager.email,
  carrierUser: {
    id: `extra-cu-${i}`,
    userId: `extra-user-${i}`,
    carrierId: `extra-${i}`,
    role: 'MANAGER',
  },
}));

describe('DemoTenantService', () => {
  let service: DemoTenantService;
  const findUsers = vi.fn();

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        DemoTenantService,
        {
          provide: PrismaService,
          useValue: {
            user: { findMany: findUsers },
            deliveryModality: {
              findMany: vi
                .fn()
                .mockResolvedValue(
                  DEMO_MODALITY_CODES.map((code) => ({ id: code, code })),
                ),
            },
          },
        },
      ],
    }).compile();
    service = moduleRef.get(DemoTenantService);
  });

  it('drops only a missing extra carrier from the simulation, logging it', async () => {
    const error = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    findUsers.mockResolvedValue([...sellers, ...members, rapido]);

    const tenant = await service.load();

    expect(tenant?.carrierId).toBe('core');
    expect(tenant?.claimUserIds).toEqual({
      core: ['member-user-1', 'member-user-2'],
      'extra-0': ['extra-user-0'],
    });
    expect(tenant?.extraCarriers).toEqual({
      'Rápido Paulista': {
        carrierId: 'extra-0',
        ownerId: 'extra-cu-0',
        ownerUserId: 'extra-user-0',
      },
    });
    expect(error).toHaveBeenCalledWith(expect.stringContaining('EconoLog'));
  });

  it('is null without the core demo accounts', async () => {
    findUsers.mockResolvedValue(members);

    await expect(service.load()).resolves.toBeNull();
  });
});
