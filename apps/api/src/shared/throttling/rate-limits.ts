import { minutes } from '@nestjs/throttler';

export const RATE_LIMIT_WINDOW = minutes(1);

export const LOGIN_RATE_LIMIT = 10;
export const SIGNUP_RATE_LIMIT = 5;
export const PUBLIC_TRACKING_RATE_LIMIT = 60;

// ThrottlerModule requires a default; every limited route overrides it through @RateLimit.
export const FALLBACK_RATE_LIMIT = SIGNUP_RATE_LIMIT;
