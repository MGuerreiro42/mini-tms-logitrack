import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { RedisIoAdapter } from './shared/websocket/redis-io.adapter';

export async function configureApp(app: NestExpressApplication): Promise<void> {
  // Behind the platform proxy every request shares its IP; rate limits need the forwarded one.
  app.set('trust proxy', 1);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);
}
