import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../generated/prisma/client';
import { PasswordService } from '../../shared/password/password.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CarriersService } from './carriers.service';
import type { CreateCarrierDto } from './dto/create-carrier.dto';

describe('CarriersService', () => {
  let carriersService: CarriersService;
  const userCreate = vi.fn();
  const carrierCreate = vi.fn();
  const carrierUserCreate = vi.fn();
  const carrierFindMany = vi.fn();
  const carrierFindUnique = vi.fn();
  const carrierUpdate = vi.fn();
  const transaction = vi.fn((callback) =>
    callback({
      user: { create: userCreate },
      carrier: { create: carrierCreate },
      carrierUser: { create: carrierUserCreate },
    }),
  );
  const hash = vi.fn();

  const dto: CreateCarrierDto = {
    email: 'manager@carrier.example.com',
    password: 'password123',
    companyName: 'Fast Freight',
    document: '12345678000199',
  };

  const carrierWithManager = {
    id: 'carrier-1',
    companyName: 'Fast Freight',
    document: '12345678000199',
    status: 'PENDING',
    createdAt: new Date('2026-01-01'),
    users: [{ user: { email: 'manager@carrier.example.com' } }],
    _count: { users: 1 },
  };

  beforeEach(async () => {
    userCreate.mockReset();
    carrierCreate.mockReset();
    carrierUserCreate.mockReset();
    carrierFindMany.mockReset();
    carrierFindUnique.mockReset();
    carrierUpdate.mockReset();
    transaction.mockClear();
    hash.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarriersService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: transaction,
            carrier: {
              findMany: carrierFindMany,
              findUnique: carrierFindUnique,
              update: carrierUpdate,
            },
          },
        },
        { provide: PasswordService, useValue: { hash } },
      ],
    }).compile();

    carriersService = module.get(CarriersService);
  });

  it('creates a User + Carrier + CarrierUser(MANAGER) and returns only safe fields', async () => {
    hash.mockResolvedValue('hashed-password');
    userCreate.mockResolvedValue({ id: 'user-1' });
    carrierCreate.mockResolvedValue({
      id: 'carrier-1',
      companyName: dto.companyName,
      document: dto.document,
      status: 'PENDING',
      createdAt: new Date('2026-01-01'),
    });
    carrierUserCreate.mockResolvedValue({ id: 'carrier-user-1' });

    const result = await carriersService.signup(dto);

    expect(hash).toHaveBeenCalledWith(dto.password);
    expect(userCreate).toHaveBeenCalledWith({
      data: {
        email: dto.email,
        passwordHash: 'hashed-password',
        role: 'CARRIER_MANAGER',
      },
    });
    expect(carrierCreate).toHaveBeenCalledWith({
      data: { companyName: dto.companyName, document: dto.document },
    });
    expect(carrierUserCreate).toHaveBeenCalledWith({
      data: { userId: 'user-1', carrierId: 'carrier-1', role: 'MANAGER' },
    });
    expect(result).toEqual({
      id: 'carrier-1',
      email: dto.email,
      companyName: dto.companyName,
      document: dto.document,
      status: 'PENDING',
      userCount: 1,
      createdAt: new Date('2026-01-01'),
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  // Same real Prisma 7 driver-adapter error shape already documented/fixed
  // for sellers (DESIGN.md § 16) — replicated here so the fix isn't
  // re-discovered per module.
  const uniqueConstraintError = (field: string) =>
    new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.8.0',
      meta: {
        modelName: field === 'email' ? 'User' : 'Carrier',
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

    await expect(carriersService.signup(dto)).rejects.toThrow(
      ConflictException,
    );
  });

  it('never reveals which field (email vs document) caused the conflict', async () => {
    hash.mockResolvedValue('hashed-password');
    transaction.mockRejectedValueOnce(uniqueConstraintError('document'));

    await expect(carriersService.signup(dto)).rejects.toMatchObject({
      response: { message: 'Email or document already registered' },
    });
  });

  describe('findAll', () => {
    it('lists carriers mapped to safe fields, using the manager email and user count', async () => {
      carrierFindMany.mockResolvedValue([carrierWithManager]);

      const result = await carriersService.findAll();

      expect(carrierFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
      expect(result).toEqual([
        {
          id: 'carrier-1',
          email: 'manager@carrier.example.com',
          companyName: 'Fast Freight',
          document: '12345678000199',
          status: 'PENDING',
          userCount: 1,
          createdAt: new Date('2026-01-01'),
        },
      ]);
    });

    it('filters by status when provided', async () => {
      carrierFindMany.mockResolvedValue([]);

      await carriersService.findAll('APPROVED');

      expect(carrierFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'APPROVED' } }),
      );
    });
  });

  describe('findOne', () => {
    it('returns the carrier when found', async () => {
      carrierFindUnique.mockResolvedValue(carrierWithManager);

      const result = await carriersService.findOne('carrier-1');

      expect(result.email).toBe('manager@carrier.example.com');
    });

    it('throws NotFoundException when the carrier does not exist', async () => {
      carrierFindUnique.mockResolvedValue(null);

      await expect(carriersService.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approve / reject', () => {
    it('approves a pending carrier', async () => {
      carrierFindUnique.mockResolvedValue(carrierWithManager);
      carrierUpdate.mockResolvedValue({
        ...carrierWithManager,
        status: 'APPROVED',
      });

      const result = await carriersService.approve('carrier-1');

      expect(carrierUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'carrier-1' },
          data: { status: 'APPROVED' },
        }),
      );
      expect(result.status).toBe('APPROVED');
    });

    it('rejects a pending carrier', async () => {
      carrierFindUnique.mockResolvedValue(carrierWithManager);
      carrierUpdate.mockResolvedValue({
        ...carrierWithManager,
        status: 'REJECTED',
      });

      const result = await carriersService.reject('carrier-1');

      expect(result.status).toBe('REJECTED');
    });

    it('throws ConflictException when the carrier is not pending', async () => {
      carrierFindUnique.mockResolvedValue({
        ...carrierWithManager,
        status: 'APPROVED',
      });

      await expect(carriersService.approve('carrier-1')).rejects.toThrow(
        ConflictException,
      );
      expect(carrierUpdate).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the carrier does not exist', async () => {
      carrierFindUnique.mockResolvedValue(null);

      await expect(carriersService.reject('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
