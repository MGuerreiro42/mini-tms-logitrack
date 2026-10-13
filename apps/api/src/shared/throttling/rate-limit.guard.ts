import { Injectable, Logger } from '@nestjs/common';
import {
  ThrottlerException,
  ThrottlerGuard,
  type ThrottlerRequest,
} from '@nestjs/throttler';

export const UNKNOWN_CLIENT = 'unknown';

const logger = new Logger('RateLimitGuard');

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    // No resolvable address: one shared bucket, so those requests stay limited instead of unlimited.
    return typeof req.ip === 'string' && req.ip ? req.ip : UNKNOWN_CLIENT;
  }

  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    try {
      return await super.handleRequest(requestProps);
    } catch (error) {
      if (error instanceof ThrottlerException) throw error;
      // Fail open: a Redis outage must not take login, signup and public tracking down with it.
      const reason = error instanceof Error ? error.message : String(error);
      logger.warn(`Rate limit storage failed, allowing request: ${reason}`);
      return true;
    }
  }
}
