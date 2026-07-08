import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PasswordService } from '../../shared/password/password.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  const findUnique = vi.fn();
  const signAsync = vi.fn();

  const email = 'seller@example.com';
  const password = 'correct-password';
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 10);
  });

  beforeEach(async () => {
    findUnique.mockReset();
    signAsync.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: { user: { findUnique } },
        },
        {
          provide: JwtService,
          useValue: { signAsync },
        },
        PasswordService,
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  it('returns an access token and the user on valid credentials', async () => {
    findUnique.mockResolvedValue({
      id: 'user-1',
      email,
      passwordHash,
      role: 'SELLER',
    });
    signAsync.mockResolvedValue('signed.jwt.token');

    const result = await authService.login(email, password);

    expect(findUnique).toHaveBeenCalledWith({ where: { email } });
    expect(signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email,
      role: 'SELLER',
    });
    expect(result).toEqual({
      accessToken: 'signed.jwt.token',
      user: { id: 'user-1', email, role: 'SELLER' },
    });
  });

  it('throws UnauthorizedException when the password is wrong', async () => {
    findUnique.mockResolvedValue({
      id: 'user-1',
      email,
      passwordHash,
      role: 'SELLER',
    });

    await expect(authService.login(email, 'wrong-password')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when the user does not exist', async () => {
    findUnique.mockResolvedValue(null);

    await expect(authService.login(email, password)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(signAsync).not.toHaveBeenCalled();
  });
});
