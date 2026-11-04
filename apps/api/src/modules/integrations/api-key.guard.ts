import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ApiKeysService } from './api-keys.service';

export const API_KEY_HEADER = 'X-Api-Key';

// Express's own types are not installed; these are the fields the API key routes read.
export interface ApiKeyRequest {
  headers: Record<string, string | string[] | undefined>;
  user: AuthenticatedUser;
  apiKeyId: string;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    const key = request.headers[API_KEY_HEADER.toLowerCase()];
    const identity =
      typeof key === 'string'
        ? await this.apiKeysService.authenticate(key)
        : null;
    if (!identity) {
      throw new UnauthorizedException('Missing, unknown or revoked API key');
    }

    request.user = identity.user;
    request.apiKeyId = identity.apiKeyId;
    return true;
  }
}
