import type { Redis } from 'ioredis';
import type { Socket } from 'socket.io-client';
import request from 'supertest';
import { findRoute } from '../src/modules/shipments/routes';
import { DEMO_SELLERS } from '../src/modules/simulator/demo-dataset';
import { REDIS_CLIENT } from '../src/shared/redis/redis.module';
import { POSITION_REPORT_RATE_LIMIT } from '../src/shared/throttling/rate-limits';
import {
  connectSocket,
  createCarrier,
  createShipment,
  createTenants,
  type E2eContext,
  randomIp,
  shipmentBody,
  startApp,
} from './support/e2e-app';
import { truncateAllTables } from './support/e2e-database';

const MINUTE = 60_000;

describe('Live map (e2e)', () => {
  let ctx: E2eContext;
  let tenants: Awaited<ReturnType<typeof createTenants>>;
  // Only demo sellers get a route, so the shipments here belong to one.
  let seller: string;
  let otherOperator: string;
  let otherCarrierOperator: string;

  const address = shipmentBody({ carrierId: '', modalityId: '' });
  const route = findRoute({
    ...address,
    seller: { user: { email: DEMO_SELLERS[0].email } },
  });
  if (!route) throw new Error('the e2e shipment address must have a route');
  const [destLng, destLat] = route.destination;
  const [hubLng, hubLat] = route.points[0];
  const far = { lat: hubLat, lng: hubLng, heading: 90 };
  const atTheDoor = { lat: destLat, lng: destLng, heading: 90 };

  const http = () => request(ctx.app.getHttpServer());
  const advance = (id: string, status: string) =>
    http()
      .patch(`/shipments/${id}/status`)
      .auth(tenants.operator, { type: 'bearer' })
      .send({ status })
      .expect(200);
  const report = (
    id: string,
    token: string,
    position: object = far,
    recordedAt = new Date(),
  ) =>
    http()
      .post(`/shipments/${id}/positions`)
      .auth(token, { type: 'bearer' })
      .send({ ...position, recordedAt });
  const publicTracking = (code: string) =>
    http().get(`/public/tracking/${code}`).expect(200);

  async function onTheRoad(
    status: 'ACCEPTED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' = 'IN_TRANSIT',
  ) {
    const shipment = await createShipment(ctx, seller, tenants);
    await http()
      .patch(`/shipments/${shipment.id}/claim`)
      .auth(tenants.operator, { type: 'bearer' })
      .expect(200);
    const path = ['COLLECTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'];
    for (const next of path.slice(0, path.indexOf(status) + 1)) {
      await advance(shipment.id, next);
    }
    return shipment;
  }

  // Socket messages arrive in order: once the status update lands, any position sent before it has too.
  async function publicPositionsUntilNextStatus(
    trackingCode: string,
    act: () => Promise<unknown>,
  ) {
    const socket = await connectSocket(ctx, '/public');
    await socket.emitWithAck('subscribe:tracking', trackingCode);
    const positions: unknown[] = [];
    socket.on('tracking:position', (payload) => positions.push(payload));
    const updated = new Promise((resolve) =>
      socket.once('tracking:updated', resolve),
    );
    await act();
    await updated;
    socket.disconnect();
    return positions;
  }

  beforeAll(async () => {
    ctx = await startApp();
    tenants = await createTenants(ctx);
    seller = await tenants.sellerToken(DEMO_SELLERS[0].email);
    otherOperator = await tenants.carrierToken('OPERATOR');
    const otherCarrier = await createCarrier(ctx, tenants.modalityId);
    otherCarrierOperator = await otherCarrier.token('OPERATOR');
  });

  afterAll(async () => {
    await ctx.app.close();
    // The demo seller's email is fixed; the demo reset spec seeds its own.
    await truncateAllTables(process.env);
  });

  describe('ingestion', () => {
    it('applies a ping from the owning operator and shows it on both details', async () => {
      const { id } = await onTheRoad();
      const recordedAt = new Date();

      const res = await report(id, tenants.operator, far, recordedAt).expect(
        202,
      );
      expect(res.body).toEqual({ applied: true });

      const lastPosition = { ...far, recordedAt: recordedAt.toISOString() };
      const sellerDetail = await http()
        .get(`/shipments/${id}`)
        .auth(seller, { type: 'bearer' })
        .expect(200);
      expect(sellerDetail.body.lastPosition).toEqual(lastPosition);
      expect(sellerDetail.body.map).toEqual({
        route: route.points,
        splitIndex: route.splitIndex,
        destination: route.destination,
      });
      const carrier = await http()
        .get(`/shipments/queue/${id}`)
        .auth(tenants.manager, { type: 'bearer' })
        .expect(200);
      expect(carrier.body.lastPosition).toEqual(lastPosition);
      expect(carrier.body.map.destination).toEqual(route.destination);
    });

    it('rate limits per user, not per address', async () => {
      const { id } = await onTheRoad();
      // A user of its own, so spending its quota leaves the other tests alone.
      const manager = await tenants.carrierToken('MANAGER');
      const fromAnywhere = () =>
        report(id, manager).set('X-Forwarded-For', randomIp());

      const statuses = await Promise.all(
        Array.from({ length: POSITION_REPORT_RATE_LIMIT }, () =>
          fromAnywhere().then((res) => res.status),
        ),
      );
      expect(new Set(statuses)).toEqual(new Set([202]));

      await fromAnywhere().expect(429);
      await report(id, tenants.operator).expect(202);
    });

    it('lets the carrier manager report for a shipment someone else owns', async () => {
      const { id } = await onTheRoad('OUT_FOR_DELIVERY');

      await report(id, tenants.manager).expect(202);
    });

    it('rejects anyone else: another operator, another carrier, a seller, an unknown id', async () => {
      const { id } = await onTheRoad();

      await report(id, otherOperator).expect(403);
      await report(id, otherCarrierOperator).expect(404);
      await report(id, seller).expect(403);
      await report(
        '00000000-0000-0000-0000-000000000000',
        tenants.operator,
      ).expect(404);
    });

    it('rejects a shipment that is not on the road', async () => {
      const { id } = await onTheRoad('ACCEPTED');

      await report(id, tenants.operator).expect(409);
    });

    it('rejects readings too old or too far ahead, and accepts up to 5 s ahead', async () => {
      const { id } = await onTheRoad();
      const at = (offsetMs: number) => new Date(Date.now() + offsetMs);

      await report(id, tenants.operator, far, at(-11 * MINUTE)).expect(400);
      await report(id, tenants.operator, far, at(6_000)).expect(400);
      await report(id, tenants.operator, { lat: 91, lng: 0 }).expect(400);
      await report(id, tenants.operator, far, at(4_000)).expect(202);
    });

    it('accepts an out-of-order or resent ping without moving the vehicle back', async () => {
      const { id } = await onTheRoad();
      const newer = new Date();
      await report(id, tenants.operator, far, newer).expect(202);

      const older = await report(
        id,
        tenants.operator,
        atTheDoor,
        new Date(newer.getTime() - 1_000),
      ).expect(202);

      expect(older.body).toEqual({ applied: false });
      const resent = await report(id, tenants.operator, far, newer).expect(202);
      expect(resent.body).toEqual({ applied: false });
      const sellerDetail = await http()
        .get(`/shipments/${id}`)
        .auth(seller, { type: 'bearer' })
        .expect(200);
      expect(sellerDetail.body.lastPosition.lat).toBe(far.lat);
    });

    it('expires the stored position 10 minutes after the reading', async () => {
      const { id } = await onTheRoad();
      await report(id, tenants.operator).expect(202);

      const ttl = await ctx.app
        .get<Redis>(REDIS_CLIENT)
        .pttl(`vehicle-position:${id}`);

      expect(ttl).toBeGreaterThan(9 * MINUTE);
      expect(ttl).toBeLessThanOrEqual(10 * MINUTE);
    });

    it('expires a buffered reading 10 minutes after it was taken, not after it arrived', async () => {
      const { id } = await onTheRoad();
      const recordedAt = new Date(Date.now() - 9 * MINUTE);
      await report(id, tenants.operator, far, recordedAt).expect(202);

      const ttl = await ctx.app
        .get<Redis>(REDIS_CLIENT)
        .pttl(`vehicle-position:${id}`);

      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(MINUTE);
    });

    it('broadcasts the internal payload to the seller room', async () => {
      const { id, trackingCode } = await onTheRoad('OUT_FOR_DELIVERY');
      const socket: Socket = await connectSocket(ctx, '/', {
        token: seller,
      });
      await socket.emitWithAck('subscribe:seller');
      const received = new Promise((resolve) =>
        socket.once('tracking:position', resolve),
      );
      const recordedAt = new Date();

      await report(id, tenants.operator, atTheDoor, recordedAt).expect(202);

      await expect(received).resolves.toStrictEqual({
        shipmentId: id,
        trackingCode,
        status: 'OUT_FOR_DELIVERY',
        ...atTheDoor,
        recordedAt: recordedAt.toISOString(),
      });
      socket.disconnect();
    });
  });

  // SC-003: nothing street-level, no address coordinates and no last-mile position on the public side.
  describe('privacy', () => {
    const streetLevel = [
      address.addressStreet,
      address.addressNeighborhood,
      address.addressZipCode.slice(0, 5),
      String(destLat),
      String(destLng),
    ];
    const expectNoStreetLevel = (payload: unknown) => {
      const json = JSON.stringify(payload);
      for (const value of streetLevel) expect(json).not.toContain(value);
    };

    it('gives the public response the route to the city and the position in transit', async () => {
      const { id, trackingCode } = await onTheRoad();
      await report(id, tenants.operator).expect(202);

      const { body } = await publicTracking(trackingCode);

      expect(Object.keys(body).sort()).toEqual([
        'addressCity',
        'addressState',
        'events',
        'lastPosition',
        'map',
        'modalityName',
        'status',
        'trackingCode',
      ]);
      expect(body.map).toEqual({
        route: route.points.slice(0, route.splitIndex + 1),
        city: route.city,
        cityCenter: route.cityCenter,
      });
      expect(Object.keys(body.lastPosition).sort()).toEqual([
        'heading',
        'lat',
        'lng',
        'recordedAt',
      ]);
      expectNoStreetLevel(body);
    });

    it('sends the public room only the code and the fix while in transit', async () => {
      const { id, trackingCode } = await onTheRoad();
      const recordedAt = new Date();

      const positions = await publicPositionsUntilNextStatus(
        trackingCode,
        async () => {
          await report(id, tenants.operator, far, recordedAt).expect(202);
          await advance(id, 'OUT_FOR_DELIVERY');
        },
      );

      expect(positions).toStrictEqual([
        { trackingCode, ...far, recordedAt: recordedAt.toISOString() },
      ]);
      expectNoStreetLevel(positions);
    });

    it('keeps the public side silent within 1.5 km of the destination', async () => {
      const { id, trackingCode } = await onTheRoad();

      const positions = await publicPositionsUntilNextStatus(
        trackingCode,
        async () => {
          await report(id, tenants.operator, atTheDoor).expect(202);
          await advance(id, 'OUT_FOR_DELIVERY');
        },
      );

      expect(positions).toEqual([]);
    });

    it('keeps the public side silent out for delivery', async () => {
      const { id, trackingCode } = await onTheRoad('OUT_FOR_DELIVERY');

      const positions = await publicPositionsUntilNextStatus(
        trackingCode,
        async () => {
          await report(id, tenants.operator, far).expect(202);
          const { body } = await publicTracking(trackingCode);
          expect(body.lastPosition).toBeNull();
          expectNoStreetLevel(body);
          await advance(id, 'DELIVERED');
        },
      );

      expect(positions).toEqual([]);
    });

    it('hides a last-mile position from the public response', async () => {
      const { id, trackingCode } = await onTheRoad();
      await report(id, tenants.operator, atTheDoor).expect(202);

      const { body } = await publicTracking(trackingCode);

      expect(body.lastPosition).toBeNull();
    });

    it('has no map for a seller outside the demo, even at a demo address', async () => {
      const { id, trackingCode } = await createShipment(
        ctx,
        tenants.sellerA,
        tenants,
      );

      const detail = await http()
        .get(`/shipments/${id}`)
        .auth(tenants.sellerA, { type: 'bearer' })
        .expect(200);
      const { body } = await publicTracking(trackingCode);

      expect(detail.body.map).toBeNull();
      expect(body.map).toBeNull();
    });

    it('has no map and no public position for an address without a route', async () => {
      const res = await http()
        .post('/shipments')
        .auth(seller, { type: 'bearer' })
        .send({ ...shipmentBody(tenants), addressNumber: '1' })
        .expect(201);

      const { body } = await publicTracking(res.body.trackingCode);

      expect(body.map).toBeNull();
      expect(body.lastPosition).toBeNull();
    });
  });
});
