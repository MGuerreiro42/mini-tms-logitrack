import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { EnvConfig } from './shared/config/env.validation';
import { RedisIoAdapter } from './shared/websocket/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService<EnvConfig, true>>(ConfigService);

  app.enableCors({
    origin: configService.get('CORS_ORIGIN', { infer: true }),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mini TMS API')
    .setDescription(
      'Transportation Management System — seller onboarding, carriers, and delivery tracking.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Explicit 0.0.0.0, not just a bare port: Railway's edge proxy connects to
  // the container over IPv4, and Node's default listen(port) with no host
  // can resolve to an IPv6-only bind depending on the runtime image — the
  // app then boots fine but is unreachable from outside (502 at the edge,
  // no request ever logged by the app itself).
  await app.listen(configService.get('PORT', { infer: true }), '0.0.0.0');
}
void bootstrap();
