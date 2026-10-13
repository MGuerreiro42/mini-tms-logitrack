import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RateLimitGuard } from './rate-limit.guard';
import { RATE_LIMIT_WINDOW } from './rate-limits';

export function RateLimit(limitPerMinute: number) {
  return applyDecorators(
    UseGuards(RateLimitGuard),
    Throttle({ default: { ttl: RATE_LIMIT_WINDOW, limit: limitPerMinute } }),
    ApiResponse({
      status: 429,
      description: `More than ${limitPerMinute} requests per minute from one IP`,
    }),
  );
}
