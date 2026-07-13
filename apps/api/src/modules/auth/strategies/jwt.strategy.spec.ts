import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const findUnique = vi.fn();
  const configGet = vi.fn().mockReturnValue('a'.repeat(16));

  const payload = {
    sub: 'user-1',
    email: 'seller@example.com',
    role: 'SELLER' as const,
  };

  const jwtStrategy = new JwtStrategy(
    { user: { findUnique } } as unknown as PrismaService,
    { get: configGet } as unknown as ConfigService,
  );

  beforeEach(() => {
    findUnique.mockReset();
  });

  it('returns the authenticated user when it still exists', async () => {
    findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'seller@example.com',
      role: 'SELLER',
    });

    const result = await jwtStrategy.validate(payload);

    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    expect(result).toEqual({
      id: 'user-1',
      email: 'seller@example.com',
      role: 'SELLER',
    });
  });

  it('throws UnauthorizedException when the user no longer exists', async () => {
    findUnique.mockResolvedValue(null);

    await expect(jwtStrategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
