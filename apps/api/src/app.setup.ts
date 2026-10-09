import { type INestApplication, ValidationPipe } from '@nestjs/common';

// Shared by main.ts and the e2e suite so tests exercise the same request pipeline.
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}
