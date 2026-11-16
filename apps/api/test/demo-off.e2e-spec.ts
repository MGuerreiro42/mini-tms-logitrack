import request from 'supertest';
import { adminToken, type E2eContext, startApp } from './support/e2e-app';

// Whatever the suite's .env says: these routes exist only with the simulator.
vi.hoisted(() => {
  process.env.DEMO_SIMULATOR = 'false';
});

describe('Demo routes with the simulator off (e2e)', () => {
  let ctx: E2eContext;
  let admin: string;

  beforeAll(async () => {
    ctx = await startApp();
    admin = await adminToken(ctx);
  });

  afterAll(async () => {
    await ctx.app.close();
    delete process.env.DEMO_SIMULATOR;
  });

  it.each([
    ['get', '/demo/status'],
    ['get', '/admin/demo'],
    ['post', '/admin/demo/chaos'],
    ['delete', '/admin/demo/chaos'],
  ] as const)('answers 404 to %s %s', async (method, url) => {
    await request(ctx.app.getHttpServer())
      [method](url)
      .auth(admin, { type: 'bearer' })
      .expect(404);
  });

  it('reports no chaos in the pulse', async () => {
    const { body } = await request(ctx.app.getHttpServer())
      .get('/admin/pulse')
      .auth(admin, { type: 'bearer' })
      .expect(200);

    expect(body.chaos).toBeNull();
  });
});
