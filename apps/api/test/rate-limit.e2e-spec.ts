import request from 'supertest';
import {
  LOGIN_RATE_LIMIT,
  PUBLIC_TRACKING_RATE_LIMIT,
} from '../src/shared/throttling/rate-limits';
import { type E2eContext, randomIp, startApp } from './support/e2e-app';

describe('Rate limiting (e2e)', () => {
  let ctx: E2eContext;

  const login = (ip: string) =>
    request(ctx.app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email: 'nobody@e2e.test', password: 'wrong-password' });

  beforeAll(async () => {
    ctx = await startApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('answers 429 once one IP exceeds the login limit, without affecting another IP', async () => {
    const ip = randomIp();

    for (let attempt = 0; attempt < LOGIN_RATE_LIMIT; attempt++) {
      await login(ip).expect(401);
    }

    const blocked = await login(ip).expect(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    await login(randomIp()).expect(401);
  });

  it('answers 429 once one IP exceeds the public tracking limit', async () => {
    const ip = randomIp();
    const lookup = () =>
      request(ctx.app.getHttpServer())
        .get('/public/tracking/TMS-000000000000')
        .set('X-Forwarded-For', ip);

    const statuses = await Promise.all(
      Array.from({ length: PUBLIC_TRACKING_RATE_LIMIT }, () =>
        lookup().then((res) => res.status),
      ),
    );
    expect(new Set(statuses)).toEqual(new Set([404]));

    await lookup().expect(429);
  });
});
