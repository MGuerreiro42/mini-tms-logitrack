import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import type { GlobalRole } from '../../../../generated/prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';

// A more specific @ApiResponse({ status: 403 }) placed above @Auth overrides the default one.
export function Auth(...roles: GlobalRole[]) {
  const decorators = [
    ApiBearerAuth(),
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiResponse({ status: 401, description: 'Missing or invalid token' }),
  ];
  if (roles.length > 0) {
    decorators.push(
      Roles(...roles),
      ApiResponse({
        status: 403,
        description: `Requires role ${roles.join(' or ')}`,
      }),
    );
  }
  return applyDecorators(...decorators);
}
