import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
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
  const carrierCount = vi.fn();
  const carrierUserFindUnique = vi.fn();
  const deliveryModalityCount = vi.fn();
  const deliveryModalityFindMany = vi.fn();
  const carrierModalityFindMany = vi.fn();
  const carrierModalityDeleteMany = vi.fn();
  const carrierModalityCreateMany = vi.fn();
  const carrierCoverageAreaFindMany = vi.fn();
  const carrierCoverageAreaDeleteMany = vi.fn();
  const carrierCoverageAreaCreateMany = vi.fn();
  const transaction = vi.fn((arg) =>
    typeof arg === 'function'
      ? arg({
          user: { create: userCreate },
          carrier: { create: carrierCreate },
          carrierUser: { create: carrierUserCreate },
        })
      : Promise.all(arg),
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
    carrierCount.mockReset();
    carrierUserFindUnique.mockReset();
    deliveryModalityCount.mockReset();
    deliveryModalityFindMany.mockReset();
    carrierModalityFindMany.mockReset();
    carrierModalityDeleteMany.mockReset();
    carrierModalityCreateMany.mockReset();
    carrierCoverageAreaFindMany.mockReset();
    carrierCoverageAreaDeleteMany.mockReset();
    carrierCoverageAreaCreateMany.mockReset();
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
              count: carrierCount,
            },
            carrierUser: { findUnique: carrierUserFindUnique },
            deliveryModality: {
              count: deliveryModalityCount,
              findMany: deliveryModalityFindMany,
            },
            carrierModality: {
              findMany: carrierModalityFindMany,
              deleteMany: carrierModalityDeleteMany,
              createMany: carrierModalityCreateMany,
            },
            carrierCoverageArea: {
              findMany: carrierCoverageAreaFindMany,
              deleteMany: carrierCoverageAreaDeleteMany,
              createMany: carrierCoverageAreaCreateMany,
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
    it('lists carriers mapped to safe fields, using the manager email and user count, wrapped in pagination meta', async () => {
      carrierFindMany.mockResolvedValue([carrierWithManager]);
      carrierCount.mockResolvedValue(1);

      const result = await carriersService.findAll();

      expect(carrierFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined, skip: 0, take: 20 }),
      );
      expect(carrierCount).toHaveBeenCalledWith({ where: undefined });
      expect(result).toEqual({
        data: [
          {
            id: 'carrier-1',
            email: 'manager@carrier.example.com',
            companyName: 'Fast Freight',
            document: '12345678000199',
            status: 'PENDING',
            userCount: 1,
            createdAt: new Date('2026-01-01'),
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
    });

    it('filters by status and paginates when provided', async () => {
      carrierFindMany.mockResolvedValue([]);
      carrierCount.mockResolvedValue(45);

      const result = await carriersService.findAll('APPROVED', 2, 10);

      expect(carrierFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'APPROVED' },
          skip: 10,
          take: 10,
        }),
      );
      expect(result.meta).toEqual({
        total: 45,
        page: 2,
        limit: 10,
        totalPages: 5,
      });
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

  describe('findByUserId', () => {
    it('resolves the carrier through CarrierUser then reuses findOne', async () => {
      carrierUserFindUnique.mockResolvedValue({ carrierId: 'carrier-1' });
      carrierFindUnique.mockResolvedValue(carrierWithManager);

      const result = await carriersService.findByUserId('user-1');

      expect(carrierUserFindUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result.id).toBe('carrier-1');
    });

    it('throws NotFoundException when the user has no CarrierUser link', async () => {
      carrierUserFindUnique.mockResolvedValue(null);

      await expect(carriersService.findByUserId('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getModalities', () => {
    it('returns the full catalog with enabled flags for the carrier', async () => {
      carrierUserFindUnique.mockResolvedValue({ carrierId: 'carrier-1' });
      deliveryModalityFindMany.mockResolvedValue([
        { id: 'modality-1', code: 'STANDARD', name: 'Standard' },
        { id: 'modality-2', code: 'EXPRESS', name: 'Express' },
      ]);
      carrierModalityFindMany.mockResolvedValue([{ modalityId: 'modality-1' }]);

      const result = await carriersService.getModalities('user-1');

      expect(carrierModalityFindMany).toHaveBeenCalledWith({
        where: { carrierId: 'carrier-1' },
        select: { modalityId: true },
      });
      expect(result).toEqual([
        { id: 'modality-1', code: 'STANDARD', name: 'Standard', enabled: true },
        { id: 'modality-2', code: 'EXPRESS', name: 'Express', enabled: false },
      ]);
    });

    it('throws NotFoundException when the user has no CarrierUser link', async () => {
      carrierUserFindUnique.mockResolvedValue(null);

      await expect(carriersService.getModalities('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setModalities', () => {
    it('throws BadRequestException when a modalityId does not exist in the catalog', async () => {
      carrierUserFindUnique.mockResolvedValue({ carrierId: 'carrier-1' });
      deliveryModalityCount.mockResolvedValue(1);

      await expect(
        carriersService.setModalities('user-1', ['modality-1', 'modality-2']),
      ).rejects.toThrow(BadRequestException);
      expect(transaction).not.toHaveBeenCalled();
    });

    it('replaces the carrier modalities and returns the updated toggles', async () => {
      carrierUserFindUnique.mockResolvedValue({ carrierId: 'carrier-1' });
      deliveryModalityCount.mockResolvedValue(1);
      carrierModalityDeleteMany.mockResolvedValue({ count: 1 });
      carrierModalityCreateMany.mockResolvedValue({ count: 1 });
      deliveryModalityFindMany.mockResolvedValue([
        { id: 'modality-1', code: 'STANDARD', name: 'Standard' },
      ]);
      carrierModalityFindMany.mockResolvedValue([{ modalityId: 'modality-1' }]);

      const result = await carriersService.setModalities('user-1', [
        'modality-1',
      ]);

      expect(carrierModalityDeleteMany).toHaveBeenCalledWith({
        where: { carrierId: 'carrier-1' },
      });
      expect(carrierModalityCreateMany).toHaveBeenCalledWith({
        data: [{ carrierId: 'carrier-1', modalityId: 'modality-1' }],
      });
      expect(result).toEqual([
        { id: 'modality-1', code: 'STANDARD', name: 'Standard', enabled: true },
      ]);
    });
  });

  describe('getCoverageAreas', () => {
    it('returns the coverage areas ordered by state then city', async () => {
      carrierUserFindUnique.mockResolvedValue({ carrierId: 'carrier-1' });
      carrierCoverageAreaFindMany.mockResolvedValue([
        { id: 'area-1', state: 'SP', city: 'São Paulo' },
      ]);

      const result = await carriersService.getCoverageAreas('user-1');

      expect(carrierCoverageAreaFindMany).toHaveBeenCalledWith({
        where: { carrierId: 'carrier-1' },
        orderBy: [{ state: 'asc' }, { city: 'asc' }],
      });
      expect(result).toEqual([
        { id: 'area-1', state: 'SP', city: 'São Paulo' },
      ]);
    });

    it('throws NotFoundException when the user has no CarrierUser link', async () => {
      carrierUserFindUnique.mockResolvedValue(null);

      await expect(carriersService.getCoverageAreas('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setCoverageAreas', () => {
    it('replaces the coverage areas and returns the updated list', async () => {
      carrierUserFindUnique.mockResolvedValue({ carrierId: 'carrier-1' });
      carrierCoverageAreaDeleteMany.mockResolvedValue({ count: 1 });
      carrierCoverageAreaCreateMany.mockResolvedValue({ count: 1 });
      carrierCoverageAreaFindMany.mockResolvedValue([
        { id: 'area-1', state: 'SP', city: null },
      ]);

      const result = await carriersService.setCoverageAreas('user-1', [
        { state: 'SP' },
      ]);

      expect(carrierCoverageAreaDeleteMany).toHaveBeenCalledWith({
        where: { carrierId: 'carrier-1' },
      });
      expect(carrierCoverageAreaCreateMany).toHaveBeenCalledWith({
        data: [{ carrierId: 'carrier-1', state: 'SP', city: null }],
        skipDuplicates: true,
      });
      expect(result).toEqual([{ id: 'area-1', state: 'SP', city: null }]);
    });

    it('throws NotFoundException when the user has no CarrierUser link', async () => {
      carrierUserFindUnique.mockResolvedValue(null);

      await expect(
        carriersService.setCoverageAreas('user-1', [{ state: 'SP' }]),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
