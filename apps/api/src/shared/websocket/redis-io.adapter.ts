import type { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { ServerOptions } from 'socket.io';
import type { EnvConfig } from '../config/env.validation';

const MAX_SOCKET_PAYLOAD_BYTES = 16 * 1024;

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private configService?: ConfigService<EnvConfig, true>;
  private redisClients: Redis[] = [];

  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  private getConfigService(): ConfigService<EnvConfig, true> {
    this.configService ??=
      this.app.get<ConfigService<EnvConfig, true>>(ConfigService);
    return this.configService;
  }

  async connectToRedis(): Promise<void> {
    const redisUrl = this.getConfigService().get('REDIS_URL', {
      infer: true,
    });

    const pubClient = new Redis(redisUrl);
    const subClient = pubClient.duplicate();
    this.redisClients = [pubClient, subClient];
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    // Gateway decorator options are evaluated before ConfigService exists, so CORS is wired here.
    const corsOrigin = this.getConfigService().get('CORS_ORIGIN', {
      infer: true,
    });

    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: corsOrigin, credentials: true },
      // Long-polling needs sticky sessions once there is more than one instance.
      transports: ['websocket'],
      // Clients only send ids and a JWT; the 1 MB default is spare room for anonymous /public sockets.
      maxHttpBufferSize: MAX_SOCKET_PAYLOAD_BYTES,
    });
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  async dispose(): Promise<void> {
    for (const client of this.redisClients) {
      client.disconnect();
    }
  }
}
