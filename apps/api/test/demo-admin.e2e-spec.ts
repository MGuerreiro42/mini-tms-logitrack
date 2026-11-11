import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { DEMO_ADMIN_DECISION_MESSAGE } from '../src/modules/auth/guards/signup-decision.guard';
import {
  DEMO_ADMIN,
  DEMO_PASSWORD,
} from '../src/modules/simulator/demo-dataset';
import { adminToken, type E2eContext, startApp } from './support/e2e-app';
import { truncateAllTables } from './support/e2e-database';

const seedDemo = () =>
  execSync('pnpm exec prisma db seed', {
    env: { ...process.env, SEED_DEMO: 'true' },
    stdio: 'ignore',
  });

describe('Demo admin (e2e)', () => {
  let ctx: E2eContext;
  let demoAdmin: string;
  let admin: string;
  let sellerId: string;
  let carrierId: string;

  const bearer = { type: 'bearer' } as const;
  const patch = (url: string, token: string) =>
    request(ctx.app.getHttpServer()).patch(url).auth(token, bearer);

  beforeAll(async () => {
    // Twice: the account must stay one row.
    seedDemo();
    seedDemo();
    ctx = await startApp();
    demoAdmin = (
      await request(ctx.app.getHttpServer())
        .post('/auth/login')
        .send({ email: DEMO_ADMIN.email, password: DEMO_PASSWORD })
        .expect(201)
    ).body.accessToken;
    admin = await adminToken(ctx);

    const user = await ctx.prisma.user.create({
      data: {
        email: `${randomUUID()}@e2e.test`,
        passwordHash: 'unused',
        role: 'SELLER',
      },
    });
    sellerId = (
      await ctx.prisma.seller.create({
        data: { userId: user.id, companyName: 'Visitor', document: '1' },
      })
    ).id;
    carrierId = (
      await ctx.prisma.carrier.create({
        data: { companyName: 'Visitor Carrier', document: '2' },
      })
    ).id;
  }, 60_000);

  afterAll(async () => {
    await ctx.app.close();
    await truncateAllTables(process.env);
  });

  it('is seeded once, as an admin', async () => {
    await expect(
      ctx.prisma.user.findMany({ where: { email: DEMO_ADMIN.email } }),
    ).resolves.toEqual([
      expect.objectContaining({ role: 'ADMIN', name: 'Demo admin' }),
    ]);
  });

  it('reads pending sign-ups', async () => {
    const { body } = await request(ctx.app.getHttpServer())
      .get('/sellers?status=PENDING')
      .auth(demoAdmin, bearer)
      .expect(200);

    expect(body.data.map((seller: { id: string }) => seller.id)).toContain(
      sellerId,
    );
  });

  it.each([
    ['sellers', () => sellerId],
    ['carriers', () => carrierId],
  ])('never decides a sign-up of %s', async (resource, id) => {
    for (const decision of ['approve', 'reject']) {
      const res = await patch(
        `/${resource}/${id()}/${decision}`,
        demoAdmin,
      ).expect(403);
      expect(res.body.message).toBe(DEMO_ADMIN_DECISION_MESSAGE);
    }
  });

  it('leaves the decision to any other admin', async () => {
    await patch(`/sellers/${sellerId}/approve`, admin).expect(200);
    await patch(`/carriers/${carrierId}/reject`, admin).expect(200);
  });
});
