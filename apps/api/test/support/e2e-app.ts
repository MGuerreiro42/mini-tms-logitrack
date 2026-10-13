import { randomInt, randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import type { GlobalRole } from '../../generated/prisma/client';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PasswordService } from '../../src/shared/password/password.service';
import { PrismaService } from '../../src/shared/prisma/prisma.service';

const PASSWORD = 'e2e-password-123';

export interface E2eContext {
  app: NestExpressApplication;
  url: string;
  prisma: PrismaService;
}

export async function startApp(): Promise<E2eContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  await configureApp(app);
  await app.listen(0);
  return { app, url: await app.getUrl(), prisma: app.get(PrismaService) };
}

export function connectSocket(
  ctx: E2eContext,
  namespace: '/' | '/public',
  options: { token?: string; transports?: string[] } = {},
): Promise<Socket> {
  const socket = io(`${ctx.url}${namespace}`, {
    transports: options.transports ?? ['websocket'],
    auth: options.token ? { token: options.token } : undefined,
    reconnection: false,
    forceNew: true,
  });
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (error) => {
      socket.close();
      reject(error);
    });
  });
}

export const randomIp = () =>
  Array.from({ length: 4 }, () => randomInt(1, 255)).join('.');

const uniqueDocument = () =>
  Array.from({ length: 14 }, () => randomInt(10)).join('');

async function createUser(ctx: E2eContext, role: GlobalRole) {
  const passwordHash = await ctx.app.get(PasswordService).hash(PASSWORD);
  return ctx.prisma.user.create({
    data: { email: `${randomUUID()}@e2e.test`, passwordHash, role },
  });
}

async function login(ctx: E2eContext, email: string): Promise<string> {
  const res = await request(ctx.app.getHttpServer())
    .post('/auth/login')
    .set('X-Forwarded-For', randomIp())
    .send({ email, password: PASSWORD })
    .expect(201);
  return res.body.accessToken;
}

export async function createTenants(ctx: E2eContext) {
  const modality = await ctx.prisma.deliveryModality.upsert({
    where: { code: 'STANDARD' },
    update: {},
    create: { code: 'STANDARD', name: 'Standard', slaHours: 72 },
  });

  const carrier = await ctx.prisma.carrier.create({
    data: {
      companyName: 'E2E Carrier',
      document: uniqueDocument(),
      status: 'APPROVED',
      coverageAreas: { create: { state: 'SP' } },
      modalities: { create: { modalityId: modality.id } },
    },
  });
  const carrierToken = async (role: 'MANAGER' | 'OPERATOR') => {
    const user = await createUser(
      ctx,
      role === 'MANAGER' ? 'CARRIER_MANAGER' : 'CARRIER_OPERATOR',
    );
    await ctx.prisma.carrierUser.create({
      data: { userId: user.id, carrierId: carrier.id, role },
    });
    return login(ctx, user.email);
  };

  const sellerToken = async () => {
    const user = await createUser(ctx, 'SELLER');
    await ctx.prisma.seller.create({
      data: {
        userId: user.id,
        companyName: 'E2E Seller',
        document: uniqueDocument(),
        status: 'APPROVED',
        enabledModalities: { create: { modalityId: modality.id } },
      },
    });
    return login(ctx, user.email);
  };

  return {
    carrierId: carrier.id,
    modalityId: modality.id,
    sellerA: await sellerToken(),
    sellerB: await sellerToken(),
    manager: await carrierToken('MANAGER'),
    operator: await carrierToken('OPERATOR'),
  };
}

export async function createShipment(
  ctx: E2eContext,
  sellerToken: string,
  tenants: { carrierId: string; modalityId: string },
): Promise<{ id: string; trackingCode: string }> {
  const res = await request(ctx.app.getHttpServer())
    .post('/shipments')
    .auth(sellerToken, { type: 'bearer' })
    .send({
      addressStreet: 'Av. Paulista',
      addressNumber: '1000',
      addressNeighborhood: 'Bela Vista',
      addressCity: 'São Paulo',
      addressState: 'SP',
      addressZipCode: '01310-100',
      modalityId: tenants.modalityId,
      carrierId: tenants.carrierId,
    })
    .expect(201);
  return res.body;
}
