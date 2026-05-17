import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3011',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3011',
] as const;

function getAllowedOrigins(): string[] {
  const configured = [process.env.FRONTEND_URL, process.env.FRONTEND_URLS]
    .filter(Boolean)
    .flatMap((value) => value!.split(','))
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);

  /**
   * Always merge dev-origin defaults so localhost vs 127.0.0.1 mismatches don't break POS fetches (e.g. "Failed to load menu").
   * Production can still add explicit origins via FRONTEND_URL / FRONTEND_URLS.
   */
  return [...new Set([...DEFAULT_ORIGINS, ...configured])];
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const allowedOrigins = getAllowedOrigins();

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  app.enableCors({
    origin: (origin, callback) => {
      // Allow same-origin or non-browser requests (health checks, server-to-server).
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🍔 The Bun Theory API running on http://localhost:${port}`);
  console.log(`🌐 CORS allowed origins: ${allowedOrigins.join(', ')}`);
  console.log("🚀 Running on port", port);
}

bootstrap();
