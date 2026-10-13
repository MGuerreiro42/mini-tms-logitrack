import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { EnvConfig } from './shared/config/env.validation';
import { RedisIoAdapter } from './shared/websocket/redis-io.adapter';

export async function configureApp(app: NestExpressApplication): Promise<void> {
  const configService = app.get<ConfigService<EnvConfig, true>>(ConfigService);
  // Hop count, never `true`: only addresses appended by our own proxies may pick the rate-limit bucket.
  app.set('trust proxy', configService.get('TRUST_PROXY', { infer: true }));
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', { infer: true }),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);
}
