import { GUARDS_METADATA } from '@nestjs/common/constants';
import { RateLimit } from './rate-limit.decorator';
import { RateLimitGuard } from './rate-limit.guard';

class Fixture {
  @RateLimit(10)
  limited() {}
}

const meta = (key: string) =>
  Reflect.getMetadata(key, Fixture.prototype.limited);

describe('RateLimit decorator', () => {
  it('applies the rate limit guard with a per-minute limit', () => {
    expect(meta(GUARDS_METADATA)).toEqual([RateLimitGuard]);
    expect(meta('THROTTLER:LIMITdefault')).toBe(10);
    expect(meta('THROTTLER:TTLdefault')).toBe(60_000);
  });

  it('documents the 429', () => {
    expect(Object.keys(meta('swagger/apiResponse'))).toEqual(['429']);
  });
});
