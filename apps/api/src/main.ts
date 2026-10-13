import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import type { EnvConfig } from './shared/config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get<ConfigService<EnvConfig, true>>(ConfigService);

  app.enableCors({
    origin: configService.get('CORS_ORIGIN', { infer: true }),
    credentials: true,
  });
  await configureApp(app);

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

  // Explicit IPv4 bind: Railway's proxy can't reach an IPv6-only default listen.
  await app.listen(configService.get('PORT', { infer: true }), '0.0.0.0');
}
void bootstrap();
