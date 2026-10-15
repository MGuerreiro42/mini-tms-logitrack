import { GUARDS_METADATA } from '@nestjs/common/constants';
import { RateLimit } from './rate-limit.decorator';
import { RateLimitGuard } from './rate-limit.guard';
import { RATE_LIMIT_WINDOW } from './rate-limits';

const LIMIT = 10;

class Fixture {
  @RateLimit(LIMIT)
  limited() {}
}

const meta = (key: string) =>
  Reflect.getMetadata(key, Fixture.prototype.limited);

describe('RateLimit decorator', () => {
  it('applies the rate limit guard with a per-minute limit', () => {
    expect(meta(GUARDS_METADATA)).toEqual([RateLimitGuard]);
    expect(meta('THROTTLER:LIMITdefault')).toBe(LIMIT);
    expect(meta('THROTTLER:TTLdefault')).toBe(RATE_LIMIT_WINDOW);
  });

  it('documents the 429', () => {
    expect(Object.keys(meta('swagger/apiResponse'))).toEqual(['429']);
  });
});
