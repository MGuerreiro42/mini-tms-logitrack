import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { RateLimit } from '../../shared/throttling/rate-limit.decorator';
import { PUBLIC_API_RATE_LIMIT } from '../../shared/throttling/rate-limits';
import { ApiKeyGuard } from './api-key.guard';

export const API_KEY_SECURITY = 'api-key';

// ApiKeyGuard goes first: the rate limit buckets requests by the key it resolves.
export function ApiKeyAuth() {
  return applyDecorators(
    ApiSecurity(API_KEY_SECURITY),
    UseGuards(ApiKeyGuard),
    RateLimit(PUBLIC_API_RATE_LIMIT),
    ApiResponse({
      status: 401,
      description: 'Missing, unknown or revoked API key',
    }),
  );
}
