import type { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { ServerOptions } from 'socket.io';
import type { EnvConfig } from '../config/env.validation';

// Redis pub/sub so room emits reach sockets connected to any API instance.
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private configService?: ConfigService<EnvConfig, true>;

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
    });
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
