import { GUARDS_METADATA } from '@nestjs/common/constants';
import { RateLimitGuard } from '../../../shared/throttling/rate-limit.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Auth, RateLimitedAuth } from './auth.decorator';
import { ROLES_KEY } from './roles.decorator';

const API_RESPONSE = 'swagger/apiResponse';

class Fixture {
  @Auth('ADMIN', 'SELLER')
  withRoles() {}

  @Auth()
  anyUser() {}

  @RateLimitedAuth(10, 'SELLER')
  limited() {}
}

const meta = (key: string, handler: () => void) =>
  Reflect.getMetadata(key, handler);

describe('Auth decorator', () => {
  it('applies the JWT and roles guards with the given roles', () => {
    const handler = Fixture.prototype.withRoles;

    expect(meta(GUARDS_METADATA, handler)).toEqual([JwtAuthGuard, RolesGuard]);
    expect(meta(ROLES_KEY, handler)).toEqual(['ADMIN', 'SELLER']);
    expect(Object.keys(meta(API_RESPONSE, handler))).toEqual(
      expect.arrayContaining(['401', '403']),
    );
  });

  it('rate limits after authenticating, so the limit can key on the user', () => {
    const handler = Fixture.prototype.limited;

    expect(meta(GUARDS_METADATA, handler)).toEqual([
      JwtAuthGuard,
      RolesGuard,
      RateLimitGuard,
    ]);
    expect(meta(ROLES_KEY, handler)).toEqual(['SELLER']);
  });

  it('sets no roles and documents no 403 when called without roles', () => {
    const handler = Fixture.prototype.anyUser;

    expect(meta(GUARDS_METADATA, handler)).toEqual([JwtAuthGuard, RolesGuard]);
    expect(meta(ROLES_KEY, handler)).toBeUndefined();
    expect(Object.keys(meta(API_RESPONSE, handler))).toEqual(['401']);
  });
});
