import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { SignupDecisionGuard } from './signup-decision.guard';

const as = (email: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user: { email } }) }),
  }) as ExecutionContext;

describe('SignupDecisionGuard', () => {
  const guard = new SignupDecisionGuard();

  it('refuses the demo admin', () => {
    expect(() => guard.canActivate(as('admin@demo.minitms.dev'))).toThrow(
      ForbiddenException,
    );
  });

  it('lets any other admin decide', () => {
    expect(guard.canActivate(as('admin@minitms.dev'))).toBe(true);
  });
});
