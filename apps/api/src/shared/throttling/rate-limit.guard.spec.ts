import { Controller, Get, Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ThrottlerModule, type ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import { RateLimit } from './rate-limit.decorator';
import { RateLimitGuard } from './rate-limit.guard';
import { FALLBACK_RATE_LIMIT, RATE_LIMIT_WINDOW } from './rate-limits';

@Controller()
class FixtureController {
  @RateLimit(2)
  @Get('limited')
  limited() {
    return 'ok';
  }
}

describe('RateLimitGuard', () => {
  let app: NestExpressApplication;

  async function start(trustProxy: number, storage?: ThrottlerStorage) {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: RATE_LIMIT_WINDOW, limit: FALLBACK_RATE_LIMIT }],
          storage,
        }),
      ],
      controllers: [FixtureController],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', trustProxy);
    await app.init();
  }

  const hit = (forwardedFor: string) =>
    request(app.getHttpServer())
      .get('/limited')
      .set('X-Forwarded-For', forwardedFor);

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('keys on the address appended by the one trusted proxy, ignoring client-supplied entries', async () => {
    await start(1);

    await hit('198.51.100.1, 203.0.113.7').expect(200);
    await hit('198.51.100.2, 203.0.113.7').expect(200);
    await hit('198.51.100.3, 203.0.113.7').expect(429);
    await hit('198.51.100.3, 203.0.113.8').expect(200);
  });

  it('reaches one hop further back per extra trusted proxy', async () => {
    await start(2);

    await hit('198.51.100.1, 203.0.113.7').expect(200);
    await hit('198.51.100.1, 203.0.113.8').expect(200);
    await hit('198.51.100.1, 203.0.113.9').expect(429);
    await hit('198.51.100.2, 203.0.113.9').expect(200);
  });

  it('ignores X-Forwarded-For entirely when no proxy is trusted', async () => {
    await start(0);

    await hit('203.0.113.7').expect(200);
    await hit('203.0.113.8').expect(200);
    await hit('203.0.113.9').expect(429);
  });

  it('falls back to one shared bucket when the request has no address', async () => {
    await start(0);
    const guard = app.get(RateLimitGuard) as unknown as {
      getTracker: (req: object) => Promise<string>;
    };

    await expect(guard.getTracker({ ip: '203.0.113.7' })).resolves.toBe(
      '203.0.113.7',
    );
    const sharedBucket = await guard.getTracker({});
    expect(sharedBucket).toBeTruthy();
    await expect(guard.getTracker({ ip: '' })).resolves.toBe(sharedBucket);
  });

  it('lets requests through, with a warning, when the storage fails', async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});
    await start(0, {
      increment: () => Promise.reject(new Error('Connection is closed.')),
    });

    await hit('203.0.113.7').expect(200);
    await hit('203.0.113.7').expect(200);
    await hit('203.0.113.7').expect(200);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Connection is closed.'),
    );
  });
});
