import request from 'supertest';
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

  it('answers 429 after 10 logins per minute from one IP, without affecting another IP', async () => {
    const ip = randomIp();

    for (let attempt = 0; attempt < 10; attempt++) {
      await login(ip).expect(401);
    }

    const blocked = await login(ip).expect(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    await login(randomIp()).expect(401);
  });

  it('answers 429 after 60 public tracking lookups per minute from one IP', async () => {
    const ip = randomIp();
    const lookup = () =>
      request(ctx.app.getHttpServer())
        .get('/public/tracking/TMS-000000000000')
        .set('X-Forwarded-For', ip);

    const statuses = await Promise.all(
      Array.from({ length: 60 }, () => lookup().then((res) => res.status)),
    );
    expect(new Set(statuses)).toEqual(new Set([404]));

    await lookup().expect(429);
  });
});
