import { randomInt, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { cityKey } from '../src/shared/transforms/normalize';
import { BR_STATES, isCnpj } from '../src/shared/validation/br-validators';
import {
  adminToken,
  createShipment,
  createTenants,
  type E2eContext,
  randomIp,
  shipmentBody,
  startApp,
} from './support/e2e-app';

const HOUR_MS = 3_600_000;

// The migration's own backfill statement, so the test breaks if it drifts from cityKey().
const CITY_KEY_BACKFILL =
  /UPDATE "CarrierCoverageArea"[\s\S]*?WHERE "city" IS NOT NULL/.exec(
    readFileSync(
      join(
        __dirname,
        '../prisma/migrations/20261106064829_phase0_foundations/migration.sql',
      ),
      'utf8',
    ),
  )?.[0];

const randomCnpj = () => {
  const base = Array.from({ length: 12 }, () => randomInt(10)).join('');
  return Array.from(
    { length: 100 },
    (_, i) => `${base}${String(i).padStart(2, '0')}`,
  ).find(isCnpj) as string;
};
const formatCnpj = (v: string) =>
  `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;

describe('Foundations (e2e)', () => {
  let ctx: E2eContext;
  let tenants: Awaited<ReturnType<typeof createTenants>>;
  let admin: string;

  const http = () => request(ctx.app.getHttpServer());
  const as = (token: string) => ({
    get: (path: string) => http().get(path).auth(token, { type: 'bearer' }),
    post: (path: string) => http().post(path).auth(token, { type: 'bearer' }),
    put: (path: string) => http().put(path).auth(token, { type: 'bearer' }),
    patch: (path: string) => http().patch(path).auth(token, { type: 'bearer' }),
  });
  const signup = (path: '/sellers' | '/carriers', document: string) =>
    http()
      .post(path)
      .set('X-Forwarded-For', randomIp())
      .send({
        email: `${randomUUID()}@e2e.test`,
        password: 'e2e-password-123',
        companyName: 'E2E Signup',
        document,
      });

  beforeAll(async () => {
    ctx = await startApp();
    tenants = await createTenants(ctx);
    admin = await adminToken(ctx);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('validation', () => {
    it('rejects a malformed CEP and stores a valid one as digits', async () => {
      await as(tenants.sellerA)
        .post('/shipments')
        .send({ ...shipmentBody(tenants), addressZipCode: 'abc' })
        .expect(400);

      const { id } = await createShipment(ctx, tenants.sellerA, tenants);
      await expect(
        ctx.prisma.shipment.findUniqueOrThrow({ where: { id } }),
      ).resolves.toMatchObject({ addressZipCode: '01310100' });
    });

    it('rejects a blank city and stores a padded one trimmed', async () => {
      await as(tenants.sellerA)
        .get('/shipments/eligible-carriers')
        .query({ state: 'SP', city: '   ', modalityId: tenants.modalityId })
        .expect(400);
      await as(tenants.sellerA)
        .post('/shipments')
        .send({ ...shipmentBody(tenants), addressCity: '   ' })
        .expect(400);
      await as(tenants.manager)
        .put('/carriers/me/coverage-areas')
        .send({ areas: [{ state: 'SP', city: ' ' }] })
        .expect(400);

      const { body } = await as(tenants.sellerA)
        .post('/shipments')
        .send({ ...shipmentBody(tenants), addressCity: '  SÃO PAULO ' })
        .expect(201);
      await expect(
        ctx.prisma.shipment.findUniqueOrThrow({ where: { id: body.id } }),
      ).resolves.toMatchObject({ addressCity: 'SÃO PAULO' });
    });

    it('rejects an unknown UF in the preview, creation and coverage', async () => {
      await as(tenants.sellerA)
        .get('/shipments/eligible-carriers')
        .query({
          state: 'zz',
          city: 'São Paulo',
          modalityId: tenants.modalityId,
        })
        .expect(400);
      await as(tenants.sellerA)
        .post('/shipments')
        .send({ ...shipmentBody(tenants), addressState: 'XX' })
        .expect(400);
      await as(tenants.manager)
        .put('/carriers/me/coverage-areas')
        .send({ areas: [{ state: 'zz' }] })
        .expect(400);
    });

    it('rejects a tax ID with a wrong check digit or of the wrong kind', async () => {
      const cnpj = randomCnpj();
      const wrongDigit = `${cnpj.slice(0, 13)}${(Number(cnpj[13]) + 1) % 10}`;

      await signup('/sellers', formatCnpj(wrongDigit)).expect(400);
      await signup('/sellers', '11111111111').expect(400);
      await signup('/carriers', '529.982.247-25').expect(400);
    });

    it('treats the same tax ID with or without punctuation as one company', async () => {
      const cnpj = randomCnpj();

      await signup('/sellers', formatCnpj(cnpj)).expect(201);
      await expect(
        ctx.prisma.seller.findUnique({ where: { document: cnpj } }),
      ).resolves.not.toBeNull();
      await signup('/sellers', cnpj).expect(409);
    });
  });

  describe('coverage matching', () => {
    it('backfills the same city key in SQL as cityKey() computes', async () => {
      const cities = [
        'São Paulo',
        'Sa\u0303o Paulo',
        '\tNiterói\n',
        ' RIBEIRÃO PRETO ',
        '\u00a0Ribeira\u0303o Preto',
        'São José dos Campos',
        'Itaú de Minas',
        'Açailândia',
        'MOGI DAS CRUZES',
      ];
      const { id: carrierId } = await ctx.prisma.carrier.create({
        data: {
          companyName: 'Key Check',
          document: randomCnpj(),
          coverageAreas: {
            // One state each: equal keys within a state would collide on the unique index.
            create: cities.map((city, i) => ({ state: BR_STATES[i], city })),
          },
        },
      });

      await ctx.prisma.$executeRawUnsafe(
        `${CITY_KEY_BACKFILL} AND "carrierId" = $1`,
        carrierId,
      );

      const rows = await ctx.prisma.carrierCoverageArea.findMany({
        where: { carrierId },
      });
      expect(rows).toHaveLength(cities.length);
      for (const row of rows) {
        expect(row.cityKey).toBe(cityKey(row.city as string));
      }
    });

    it('matches a city however its accents and case are typed', async () => {
      const carrier = await createTenants(ctx);
      const saved = await as(carrier.manager)
        .put('/carriers/me/coverage-areas')
        .send({
          areas: [
            { state: 'sp', city: 'São Paulo' },
            { state: 'SP', city: 'SAO PAULO' },
          ],
        })
        .expect(200);
      expect(saved.body).toEqual([
        expect.objectContaining({ state: 'SP', city: 'São Paulo' }),
      ]);

      const eligible = async (city: string) =>
        (
          await as(carrier.sellerA)
            .get('/shipments/eligible-carriers')
            .query({ state: 'sp', city, modalityId: carrier.modalityId })
            .expect(200)
        ).body.map((c: { id: string }) => c.id);

      expect(await eligible('Sao Paulo')).toContain(carrier.carrierId);
      expect(await eligible(' SÃO PAULO ')).toContain(carrier.carrierId);
      expect(await eligible('Sorocaba')).not.toContain(carrier.carrierId);
      await as(carrier.sellerA)
        .post('/shipments')
        .send({ ...shipmentBody(carrier), addressCity: 'sao paulo' })
        .expect(201);
    });
  });

  describe('SLA dates and actors', () => {
    it('stores dueAt at creation, deliveredAt at delivery and the actor of each event', async () => {
      const shipment = await createShipment(ctx, tenants.sellerA, tenants);
      const path = `/shipments/${shipment.id}`;
      await as(tenants.operator).patch(`${path}/claim`).expect(200);
      for (const status of [
        'COLLECTED',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
      ]) {
        await as(tenants.operator)
          .patch(`${path}/status`)
          .send({ status })
          .expect(200);
      }

      const events = await ctx.prisma.trackingEvent.findMany({
        where: { shipmentId: shipment.id },
        orderBy: { createdAt: 'asc' },
        include: { actor: { select: { role: true } } },
      });
      expect(events.map((e) => e.actor?.role)).toEqual([
        'SELLER',
        'CARRIER_OPERATOR',
        'CARRIER_OPERATOR',
        'CARRIER_OPERATOR',
        'CARRIER_OPERATOR',
        'CARRIER_OPERATOR',
      ]);
      const operatorId = events[1].actorId as string;
      await ctx.prisma.user.update({
        where: { id: operatorId },
        data: { name: 'Ana Souza' },
      });

      const detail = (
        await as(tenants.manager).get(`/shipments/queue/${shipment.id}`)
      ).body;
      const createdAt = new Date(detail.createdAt).getTime();
      expect(new Date(detail.dueAt).getTime() - createdAt).toBe(72 * HOUR_MS);
      expect(detail.deliveredAt).toBe(detail.trackingEvents.at(-1).createdAt);
      expect(
        detail.trackingEvents.map((e: { actorName: string }) => e.actorName),
      ).toEqual([null, ...Array(5).fill('Ana Souza')]);
    });

    it('records the seller as the actor of a cancel', async () => {
      const shipment = await createShipment(ctx, tenants.sellerA, tenants);
      const detail = (
        await as(tenants.sellerA)
          .patch(`/shipments/${shipment.id}/cancel`)
          .expect(200)
      ).body;
      expect(detail.deliveredAt).toBeNull();

      const cancelled = await ctx.prisma.trackingEvent.findFirstOrThrow({
        where: { shipmentId: shipment.id, status: 'CANCELLED' },
        include: { actor: { select: { role: true } } },
      });
      expect(cancelled.actor?.role).toBe('SELLER');
    });
  });

  describe('admin shipment detail', () => {
    it('returns any shipment with its timeline, seller, carrier and owner', async () => {
      const shipment = await createShipment(ctx, tenants.sellerB, tenants);
      await as(tenants.operator)
        .patch(`/shipments/${shipment.id}/claim`)
        .expect(200);

      const res = await as(admin)
        .get(`/admin/shipments/${shipment.id}`)
        .expect(200);
      expect(res.body).toMatchObject({
        id: shipment.id,
        sellerCompanyName: 'E2E Seller',
        carrierCompanyName: 'E2E Carrier',
        ownerEmail: expect.stringMatching(/@e2e\.test$/),
        // The operator was named by the actor-name test above.
        ownerName: 'Ana Souza',
        trackingEvents: [
          { status: 'PENDING', actorName: null },
          { status: 'ACCEPTED' },
        ],
      });
      expect(res.body).not.toHaveProperty('map');
    });

    it('is admin only and 404s an unknown id', async () => {
      const shipment = await createShipment(ctx, tenants.sellerA, tenants);
      await as(tenants.sellerA)
        .get(`/admin/shipments/${shipment.id}`)
        .expect(403);
      await as(tenants.manager)
        .get(`/admin/shipments/${shipment.id}`)
        .expect(403);
      await as(admin).get(`/admin/shipments/${randomUUID()}`).expect(404);
      await as(admin).get('/admin/shipments/status-counts').expect(200);
    });
  });

  it('names the sender and the carrier on public tracking, never an actor', async () => {
    const { trackingCode } = await createShipment(
      ctx,
      tenants.sellerA,
      tenants,
    );

    const res = await http()
      .get(`/public/tracking/${trackingCode}`)
      .set('X-Forwarded-For', randomIp())
      .expect(200);
    expect(res.body).toMatchObject({
      sellerName: 'E2E Seller',
      carrierName: 'E2E Carrier',
    });
    expect(res.body.events).toEqual([
      { status: 'PENDING', createdAt: expect.any(String) },
    ]);
  });
});
