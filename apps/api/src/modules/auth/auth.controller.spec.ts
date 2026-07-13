import { Test, type TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

describe('AuthController', () => {
  let controller: AuthController;
  const login = vi.fn();

  beforeEach(async () => {
    login.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: { login } }],
    }).compile();

    controller = module.get(AuthController);
  });

  describe('login', () => {
    it('delegates to AuthService.login with the DTO fields', async () => {
      const response = { accessToken: 'token', user: { id: 'user-1' } };
      login.mockResolvedValue(response);

      const result = await controller.login({
        email: 'seller@example.com',
        password: 'password123',
      });

      expect(login).toHaveBeenCalledWith('seller@example.com', 'password123');
      expect(result).toEqual(response);
    });
  });

  describe('me', () => {
    it('returns the authenticated user from the request as-is', () => {
      const user: AuthenticatedUser = {
        id: 'user-1',
        email: 'seller@example.com',
        role: 'SELLER',
      };

      expect(controller.me(user)).toEqual(user);
    });
  });
});
