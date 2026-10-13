import request from 'supertest';
import { type E2eContext, startApp } from './support/e2e-app';

describe('Health (e2e)', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await startApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('reports Postgres and Redis as up, without a token', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(res.body).toMatchObject({
      status: 'ok',
      info: { database: { status: 'up' }, redis: { status: 'up' } },
    });
  });

  it('is not rate limited', async () => {
    const statuses = await Promise.all(
      Array.from({ length: 70 }, () =>
        request(ctx.app.getHttpServer())
          .get('/health')
          .then((res) => res.status),
      ),
    );

    expect(new Set(statuses)).toEqual(new Set([200]));
  });
});
