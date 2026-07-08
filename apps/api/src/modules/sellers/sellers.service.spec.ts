import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../generated/prisma/client';
import { PasswordService } from '../../shared/password/password.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { CreateSellerDto } from './dto/create-seller.dto';
import { SellersService } from './sellers.service';

describe('SellersService', () => {
  let sellersService: SellersService;
  const userCreate = vi.fn();
  const sellerCreate = vi.fn();
  const sellerFindMany = vi.fn();
  const sellerFindUnique = vi.fn();
  const sellerUpdate = vi.fn();
  const sellerCount = vi.fn();
  const transaction = vi.fn((callback) =>
    callback({
      user: { create: userCreate },
      seller: { create: sellerCreate },
    }),
  );
  const hash = vi.fn();

  const dto: CreateSellerDto = {
    email: 'seller@example.com',
    password: 'password123',
    companyName: 'Example Store',
    document: '12345678000199',
  };

  const sellerWithUser = {
    id: 'seller-1',
    companyName: 'Example Store',
    document: '12345678000199',
    status: 'PENDING',
    createdAt: new Date('2026-01-01'),
    user: { email: 'seller@example.com' },
  };

  beforeEach(async () => {
    userCreate.mockReset();
    sellerCreate.mockReset();
    sellerFindMany.mockReset();
    sellerFindUnique.mockReset();
    sellerUpdate.mockReset();
    sellerCount.mockReset();
    transaction.mockClear();
    hash.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellersService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: transaction,
            seller: {
              findMany: sellerFindMany,
              findUnique: sellerFindUnique,
              update: sellerUpdate,
              count: sellerCount,
            },
          },
        },
        { provide: PasswordService, useValue: { hash } },
      ],
    }).compile();

    sellersService = module.get(SellersService);
  });

  it('creates a User + Seller and returns only safe fields', async () => {
    hash.mockResolvedValue('hashed-password');
    userCreate.mockResolvedValue({ id: 'user-1' });
    sellerCreate.mockResolvedValue({
      id: 'seller-1',
      companyName: dto.companyName,
      document: dto.document,
      status: 'PENDING',
      createdAt: new Date('2026-01-01'),
    });

    const result = await sellersService.signup(dto);

    expect(hash).toHaveBeenCalledWith(dto.password);
    expect(userCreate).toHaveBeenCalledWith({
      data: {
        email: dto.email,
        passwordHash: 'hashed-password',
        role: 'SELLER',
      },
    });
    expect(sellerCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        companyName: dto.companyName,
        document: dto.document,
      },
    });
    expect(result).toEqual({
      id: 'seller-1',
      email: dto.email,
      companyName: dto.companyName,
      document: dto.document,
      status: 'PENDING',
      createdAt: new Date('2026-01-01'),
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  // Prisma 7's driver adapters report the colliding unique field under
  // meta.driverAdapterError.cause.constraint.fields, NOT meta.target (the
  // shape used by older Prisma versions / non-adapter engines) — this is
  // the real shape observed against Postgres via @prisma/adapter-pg, not a
  // guess, so the test exercises the actual code path in production.
  const uniqueConstraintError = (field: string) =>
    new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.8.0',
      meta: {
        modelName: field === 'email' ? 'User' : 'Seller',
        driverAdapterError: {
          name: 'DriverAdapterError',
          cause: {
            originalCode: '23505',
            kind: 'UniqueConstraintViolation',
            constraint: { fields: [field] },
          },
        },
      },
    });

  it('throws ConflictException when email or document is already registered', async () => {
    hash.mockResolvedValue('hashed-password');
    transaction.mockRejectedValueOnce(uniqueConstraintError('email'));

    await expect(sellersService.signup(dto)).rejects.toThrow(ConflictException);
  });

  it('never reveals which field (email vs document) caused the conflict', async () => {
    hash.mockResolvedValue('hashed-password');
    transaction.mockRejectedValueOnce(uniqueConstraintError('document'));

    await expect(sellersService.signup(dto)).rejects.toMatchObject({
      response: { message: 'Email or document already registered' },
    });
  });

  describe('findAll', () => {
    it('lists sellers mapped to safe fields, using the email from the linked User, wrapped in pagination meta', async () => {
      sellerFindMany.mockResolvedValue([sellerWithUser]);
      sellerCount.mockResolvedValue(1);

      const result = await sellersService.findAll();

      expect(sellerFindMany).toHaveBeenCalledWith({
        where: undefined,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(sellerCount).toHaveBeenCalledWith({ where: undefined });
      expect(result).toEqual({
        data: [
          {
            id: 'seller-1',
            email: 'seller@example.com',
            companyName: 'Example Store',
            document: '12345678000199',
            status: 'PENDING',
            createdAt: new Date('2026-01-01'),
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
    });

    it('filters by status and paginates when provided', async () => {
      sellerFindMany.mockResolvedValue([]);
      sellerCount.mockResolvedValue(45);

      const result = await sellersService.findAll('APPROVED', 2, 10);

      expect(sellerFindMany).toHaveBeenCalledWith({
        where: { status: 'APPROVED' },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      });
      expect(sellerCount).toHaveBeenCalledWith({
        where: { status: 'APPROVED' },
      });
      expect(result.meta).toEqual({
        total: 45,
        page: 2,
        limit: 10,
        totalPages: 5,
      });
    });
  });

  describe('findOne', () => {
    it('returns the seller when found', async () => {
      sellerFindUnique.mockResolvedValue(sellerWithUser);

      const result = await sellersService.findOne('seller-1');

      expect(result.email).toBe('seller@example.com');
    });

    it('throws NotFoundException when the seller does not exist', async () => {
      sellerFindUnique.mockResolvedValue(null);

      await expect(sellersService.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approve / reject', () => {
    it('approves a pending seller', async () => {
      sellerFindUnique.mockResolvedValue(sellerWithUser);
      sellerUpdate.mockResolvedValue({
        ...sellerWithUser,
        status: 'APPROVED',
      });

      const result = await sellersService.approve('seller-1');

      expect(sellerUpdate).toHaveBeenCalledWith({
        where: { id: 'seller-1' },
        data: { status: 'APPROVED' },
        include: { user: true },
      });
      expect(result.status).toBe('APPROVED');
    });

    it('rejects a pending seller', async () => {
      sellerFindUnique.mockResolvedValue(sellerWithUser);
      sellerUpdate.mockResolvedValue({
        ...sellerWithUser,
        status: 'REJECTED',
      });

      const result = await sellersService.reject('seller-1');

      expect(sellerUpdate).toHaveBeenCalledWith({
        where: { id: 'seller-1' },
        data: { status: 'REJECTED' },
        include: { user: true },
      });
      expect(result.status).toBe('REJECTED');
    });

    it('throws ConflictException when the seller is not pending', async () => {
      sellerFindUnique.mockResolvedValue({
        ...sellerWithUser,
        status: 'APPROVED',
      });

      await expect(sellersService.approve('seller-1')).rejects.toThrow(
        ConflictException,
      );
      expect(sellerUpdate).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the seller does not exist', async () => {
      sellerFindUnique.mockResolvedValue(null);

      await expect(sellersService.reject('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
