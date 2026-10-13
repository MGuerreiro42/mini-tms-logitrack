import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { minutes, Throttle, ThrottlerGuard } from '@nestjs/throttler';

export function RateLimit(limitPerMinute: number) {
  return applyDecorators(
    UseGuards(ThrottlerGuard),
    Throttle({ default: { ttl: minutes(1), limit: limitPerMinute } }),
    ApiResponse({
      status: 429,
      description: `More than ${limitPerMinute} requests per minute from one IP`,
    }),
  );
}
