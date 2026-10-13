import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { minutes, Throttle } from '@nestjs/throttler';
import { RateLimitGuard } from './rate-limit.guard';

export function RateLimit(limitPerMinute: number) {
  return applyDecorators(
    UseGuards(RateLimitGuard),
    Throttle({ default: { ttl: minutes(1), limit: limitPerMinute } }),
    ApiResponse({
      status: 429,
      description: `More than ${limitPerMinute} requests per minute from one IP`,
    }),
  );
}
