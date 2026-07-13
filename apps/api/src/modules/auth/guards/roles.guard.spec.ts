import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { GlobalRole } from '../../../../generated/prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const getAllAndOverride = vi.fn();
  let guard: RolesGuard;

  const buildContext = (role: GlobalRole): ExecutionContext =>
    ({
      getHandler: () => vi.fn(),
      getClass: () => vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'user-1', email: 'a@b.com', role } }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    getAllAndOverride.mockReset();
    guard = new RolesGuard({ getAllAndOverride } as unknown as Reflector);
  });

  it('allows the request when no roles are required', () => {
    getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(buildContext('SELLER'))).toBe(true);
  });

  it('allows the request when the required roles list is empty', () => {
    getAllAndOverride.mockReturnValue([]);

    expect(guard.canActivate(buildContext('SELLER'))).toBe(true);
  });

  it('allows the request when the user role matches one of the required roles', () => {
    getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(guard.canActivate(buildContext('ADMIN'))).toBe(true);
  });

  it('denies the request when the user role does not match', () => {
    getAllAndOverride.mockReturnValue(['ADMIN']);

    expect(guard.canActivate(buildContext('SELLER'))).toBe(false);
  });
});
