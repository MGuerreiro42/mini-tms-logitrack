import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { API_KEY_HEADER } from './modules/integrations/api-key.guard';
import { API_KEY_SECURITY } from './modules/integrations/api-key-auth.decorator';
import type { EnvConfig } from './shared/config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // The webhook test inbox verifies signatures over the exact bytes received.
    rawBody: true,
  });
  const configService = app.get<ConfigService<EnvConfig, true>>(ConfigService);

  await configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mini TMS API')
    .setDescription(
      'Transportation Management System — seller onboarding, carriers, and delivery tracking.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', in: 'header', name: API_KEY_HEADER },
      API_KEY_SECURITY,
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // A bare port can bind IPv6-only, unreachable behind Railway's IPv4 proxy.
  await app.listen(configService.get('PORT', { infer: true }), '0.0.0.0');
}
void bootstrap();
