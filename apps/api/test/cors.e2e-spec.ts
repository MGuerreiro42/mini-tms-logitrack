import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { type E2eContext, startApp } from './support/e2e-app';

describe('CORS (e2e)', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await startApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('allows credentialed requests from the configured origin only', async () => {
    const allowedOrigin = ctx.app.get(ConfigService).get('CORS_ORIGIN');

    const res = await request(ctx.app.getHttpServer())
      .get('/health')
      .set('Origin', 'https://elsewhere.example')
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});
