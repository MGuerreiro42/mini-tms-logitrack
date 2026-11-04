import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { hashApiKey } from './api-key';
import { ApiKeysService } from './api-keys.service';

describe('ApiKeysService', () => {
  let apiKeysService: ApiKeysService;
  const prisma = {
    seller: { findUnique: vi.fn() },
    apiKey: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  const storedKey = (overrides: object = {}) => ({
    id: 'key-1',
    revokedAt: null,
    lastUsedAt: null,
    seller: { user: { id: 'user-1', email: 'seller@example.com' } },
    ...overrides,
  });

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiKeysService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    apiKeysService = module.get(ApiKeysService);
  });

  describe('create', () => {
    it('refuses a seller that is not approved', async () => {
      prisma.seller.findUnique.mockResolvedValue({
        id: 'seller-1',
        status: 'PENDING',
      });

      await expect(
        apiKeysService.create('user-1', { name: 'ERP' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.apiKey.create).not.toHaveBeenCalled();
    });

    it('stores only the hash of the key it returns', async () => {
      prisma.seller.findUnique.mockResolvedValue({
        id: 'seller-1',
        status: 'APPROVED',
      });
      prisma.apiKey.create.mockImplementation(({ data }) => ({
        id: 'key-1',
        lastUsedAt: null,
        createdAt: new Date(),
        ...data,
      }));

      const created = await apiKeysService.create('user-1', { name: 'ERP' });

      const { data } = prisma.apiKey.create.mock.calls[0][0];
      expect(data.hash).toBe(hashApiKey(created.key));
      expect(data).not.toHaveProperty('key');
    });
  });

  describe('revoke', () => {
    it("returns 404 for a key of another seller, scoping by the caller's user", async () => {
      prisma.apiKey.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        apiKeysService.revoke('user-1', 'key-of-someone-else'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.apiKey.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'key-of-someone-else',
          seller: { userId: 'user-1' },
          revokedAt: null,
        },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('authenticate', () => {
    it('resolves a key to its seller user', async () => {
      prisma.apiKey.findUnique.mockResolvedValue(storedKey());

      await expect(apiKeysService.authenticate('tms_abc')).resolves.toEqual({
        apiKeyId: 'key-1',
        user: { id: 'user-1', email: 'seller@example.com', role: 'SELLER' },
      });
      expect(prisma.apiKey.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { hash: hashApiKey('tms_abc') } }),
      );
    });

    it('rejects a revoked key', async () => {
      prisma.apiKey.findUnique.mockResolvedValue(
        storedKey({ revokedAt: new Date() }),
      );

      await expect(apiKeysService.authenticate('tms_abc')).resolves.toBeNull();
    });

    it('skips the lookup for a value without the key prefix', async () => {
      await expect(apiKeysService.authenticate('')).resolves.toBeNull();
      expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
    });

    it('records the last use at most once a minute', async () => {
      prisma.apiKey.findUnique.mockResolvedValue(
        storedKey({ lastUsedAt: new Date() }),
      );
      await apiKeysService.authenticate('tms_abc');
      expect(prisma.apiKey.update).not.toHaveBeenCalled();

      prisma.apiKey.findUnique.mockResolvedValue(
        storedKey({ lastUsedAt: new Date(Date.now() - 2 * 60_000) }),
      );
      await apiKeysService.authenticate('tms_abc');
      expect(prisma.apiKey.update).toHaveBeenCalledOnce();
    });
  });
});
