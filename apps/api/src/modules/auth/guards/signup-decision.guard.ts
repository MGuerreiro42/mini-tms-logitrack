import {
  applyDecorators,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { GlobalRole } from '../../../../generated/prisma/client';
import { DEMO_ADMIN } from '../../simulator/demo-dataset';
import { Auth } from '../decorators/auth.decorator';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';

export const DEMO_ADMIN_DECISION_MESSAGE =
  "The demo admin can't approve or reject sign-ups";

// Its password is public, and sign-ups on the demo deployment may be real (spec 08 FR-002).
@Injectable()
export class SignupDecisionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    if (user.email === DEMO_ADMIN.email) {
      throw new ForbiddenException(DEMO_ADMIN_DECISION_MESSAGE);
    }
    return true;
  }
}

// For approve and reject: Auth's guards go first, so the user is known when this one runs;
// the 403 description comes last, so it replaces Auth's.
export function SignupDecisionAuth() {
  return applyDecorators(
    Auth(GlobalRole.ADMIN),
    UseGuards(SignupDecisionGuard),
    ApiResponse({
      status: 403,
      description: 'Requires role ADMIN, other than the demo admin',
    }),
  );
}
