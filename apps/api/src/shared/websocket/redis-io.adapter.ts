import type { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { ServerOptions } from 'socket.io';
import type { EnvConfig } from '../config/env.validation';

// The literal point of building this instead of leaving the Gateway on
// Socket.IO's default in-memory adapter (DESIGN.md § 1/§ 5/§ 6): a bare
// @WebSocketGateway only knows about sockets connected to its own process —
// server.to(room).emit(...) never reaches a client connected to a different
// instance behind a load balancer. This adapter makes every `.emit()` call
// publish to Redis instead, and every instance subscribed to the same
// channel delivers to its own local sockets — the cross-instance pub/sub
// this project's real-time architecture is actually about, not a manual
// side-channel.
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private configService?: ConfigService<EnvConfig, true>;

  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  // Both callers below run once at bootstrap, so resolving twice was never
  // a hot-path cost — but there's no reason to ask the DI container for the
  // same instance twice when the first result is trivially cached.
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
    // Read via real DI (this.app.get), not process.env directly — decorator
    // options on @WebSocketGateway() are evaluated at class-definition time,
    // before ConfigService even exists, so CORS has to be wired here instead.
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
