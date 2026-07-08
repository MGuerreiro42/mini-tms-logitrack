import { ConflictException } from '@nestjs/common';
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
  const transaction = vi.fn((callback) =>
    callback({
      user: { create: userCreate },
      seller: { create: sellerCreate },
    }),
  );
  const hash = vi.fn();

  const dto: CreateSellerDto = {
    email: 'loja@exemplo.com',
    password: 'password123',
    companyName: 'Loja Exemplo',
    document: '12345678000199',
  };

  beforeEach(async () => {
    userCreate.mockReset();
    sellerCreate.mockReset();
    transaction.mockClear();
    hash.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellersService,
        { provide: PrismaService, useValue: { $transaction: transaction } },
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

  it('throws ConflictException when email or document is already registered', async () => {
    hash.mockResolvedValue('hashed-password');
    transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.8.0',
        meta: { target: ['email'] },
      }),
    );

    await expect(sellersService.signup(dto)).rejects.toThrow(ConflictException);
  });
});
