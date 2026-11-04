import { createHash } from 'node:crypto';
import {
  BadRequestException,
  type CallHandler,
  ConflictException,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Redis } from 'ioredis';
import { catchError, mergeMap, type Observable, of } from 'rxjs';
import { REDIS_CLIENT } from '../../shared/redis/redis.module';
import type { ApiKeyRequest } from './api-key.guard';

export const IDEMPOTENCY_HEADER = 'Idempotency-Key';
export const IDEMPOTENCY_KEY_MAX_LENGTH = 255;
const RESPONSE_TTL_SECONDS = 24 * 60 * 60;
// Well above a create's duration: a claim left behind by a crash frees the key soon, not after a day.
const CLAIM_TTL_SECONDS = 60;

interface IdempotencyResponse {
  statusCode: number;
  status(code: number): IdempotencyResponse;
  setHeader(name: string, value: string): unknown;
}

interface IdempotencyRecord {
  fingerprint: string;
  status?: number;
  body?: unknown;
}

// For POST routes behind ApiKeyGuard: keys are scoped to the API key, and only successful responses are kept.
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest<ApiKeyRequest>();
    const idempotencyKey = request.headers[IDEMPOTENCY_HEADER.toLowerCase()];
    if (idempotencyKey === undefined) return next.handle();
    if (
      typeof idempotencyKey !== 'string' ||
      !idempotencyKey ||
      idempotencyKey.length > IDEMPOTENCY_KEY_MAX_LENGTH
    ) {
      throw new BadRequestException(
        `${IDEMPOTENCY_HEADER} must have 1 to ${IDEMPOTENCY_KEY_MAX_LENGTH} characters`,
      );
    }

    const redisKey = `idempotency:${request.apiKeyId}:${idempotencyKey}`;
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(request.body ?? null))
      .digest('hex');
    const response = http.getResponse<IdempotencyResponse>();
    const claimed = await this.redis.set(
      redisKey,
      JSON.stringify({ fingerprint } satisfies IdempotencyRecord),
      'EX',
      CLAIM_TTL_SECONDS,
      'NX',
    );
    if (claimed !== 'OK') {
      return of(await this.replay(redisKey, fingerprint, response));
    }

    // Only a failed handler releases the key: once the shipment exists, a failed store must not allow a second one.
    return next.handle().pipe(
      catchError(async (error) => {
        await this.redis.del(redisKey).catch(() => undefined);
        throw error;
      }),
      mergeMap(async (body) => {
        const record: IdempotencyRecord = {
          fingerprint,
          status: response.statusCode,
          body,
        };
        await this.redis.set(
          redisKey,
          JSON.stringify(record),
          'EX',
          RESPONSE_TTL_SECONDS,
        );
        return body;
      }),
    );
  }

  private async replay(
    redisKey: string,
    fingerprint: string,
    response: IdempotencyResponse,
  ): Promise<unknown> {
    const stored = await this.redis.get(redisKey);
    const record = stored ? (JSON.parse(stored) as IdempotencyRecord) : null;
    if (record && record.fingerprint !== fingerprint) {
      throw new UnprocessableEntityException(
        `This ${IDEMPOTENCY_HEADER} was already used with a different request body`,
      );
    }
    if (record?.status === undefined) {
      throw new ConflictException(
        `A request with this ${IDEMPOTENCY_HEADER} is still in progress`,
      );
    }

    response.status(record.status).setHeader('Idempotent-Replayed', 'true');
    return record.body;
  }
}
