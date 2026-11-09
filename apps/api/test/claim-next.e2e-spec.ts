import request from 'supertest';
import {
  createShipment,
  createTenants,
  type E2eContext,
  startApp,
} from './support/e2e-app';

const HOUR_MS = 3_600_000;

describe('Claim next (e2e)', () => {
  let ctx: E2eContext;
  let tenants: Awaited<ReturnType<typeof createTenants>>;

  const claimNext = (token: string) =>
    request(ctx.app.getHttpServer())
      .post('/shipments/queue/claim-next')
      .auth(token, { type: 'bearer' });
  const unclaimedDueIn = async (hours: number) => {
    const { id } = await createShipment(ctx, tenants.sellerA, tenants);
    await ctx.prisma.shipment.update({
      where: { id },
      data: { dueAt: new Date(Date.now() + hours * HOUR_MS) },
    });
    return id;
  };

  beforeAll(async () => {
    ctx = await startApp();
    tenants = await createTenants(ctx);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('answers 409 when nothing is waiting', async () => {
    const res = await claimNext(tenants.operator).expect(409);
    expect(res.body.message).toBe('No shipment is waiting to be claimed');
  });

  it('claims the earliest-due shipment first', async () => {
    await unclaimedDueIn(30);
    const urgent = await unclaimedDueIn(3);

    const res = await claimNext(tenants.operator).expect(200);

    expect(res.body).toMatchObject({ id: urgent, status: 'ACCEPTED' });
    await claimNext(tenants.operator).expect(200);
  });

  it('never gives two parallel calls the same shipment', async () => {
    await unclaimedDueIn(10);
    await unclaimedDueIn(20);

    const responses = await Promise.all([
      claimNext(tenants.operator),
      claimNext(tenants.manager),
    ]);

    expect(responses.map((res) => res.status)).toEqual([200, 200]);
    expect(new Set(responses.map((res) => res.body.id)).size).toBe(2);
    await claimNext(tenants.operator).expect(409);
  });
});
